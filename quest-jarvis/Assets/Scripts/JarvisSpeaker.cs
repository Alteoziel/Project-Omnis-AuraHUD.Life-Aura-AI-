using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestJarvis
{
    [DefaultExecutionOrder(50)]
    public class JarvisSpeaker : MonoBehaviour
    {
        public bool IsSpeaking { get; private set; }
        public event Action<string> LineStarted;

        AudioSource _source;
        readonly Queue<string> _lines = new Queue<string>();
        AndroidTts _android;
        bool _androidReady;

        class AndroidInit : AndroidJavaProxy
        {
            public volatile int status = -1;
            public AndroidInit() : base("android.speech.tts.TextToSpeech$OnInitListener") { }
            public void onInit(int result) { status = result; }
        }

        class AndroidTts
        {
            public AndroidJavaObject engine;
            public AndroidInit init;
        }

        void Awake()
        {
            _source = gameObject.AddComponent<AudioSource>();
            _source.spatialBlend = 1f;
            _source.minDistance = 0.4f;
            _source.maxDistance = 8f;
            _source.volume = 1f;
            _source.playOnAwake = false;
        }

        void Start()
        {
            StartCoroutine(BootAndroid());
        }

        IEnumerator BootAndroid()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            AndroidInit init = null;
            AndroidJavaObject engine = null;
            try
            {
                using (var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                using (var activity = player.GetStatic<AndroidJavaObject>("currentActivity"))
                {
                    init = new AndroidInit();
                    engine = new AndroidJavaObject("android.speech.tts.TextToSpeech", activity, init);
                }
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] headset voice unavailable: " + e.Message);
                yield break;
            }
            float wait = 0f;
            while (init.status < 0 && wait < 4f)
            {
                wait += Time.deltaTime;
                yield return null;
            }
            if (init.status != 0)
            {
                Debug.Log("[Jarvis] headset voice init status " + init.status);
                yield break;
            }
            try
            {
                using (var localeClass = new AndroidJavaClass("java.util.Locale"))
                {
                    var us = localeClass.GetStatic<AndroidJavaObject>("US");
                    engine.Call<int>("setLanguage", us);
                }
                engine.Call<int>("setPitch", 0.92f);
                engine.Call<int>("setSpeechRate", 1.0f);
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] headset voice language: " + e.Message);
            }
            _android = new AndroidTts { engine = engine, init = init };
            _androidReady = true;
#else
            yield break;
#endif
        }

        public void Say(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return;
            _lines.Enqueue(text.Trim());
            if (!IsSpeaking)
                StartCoroutine(SpeakQueue());
        }

        IEnumerator SpeakQueue()
        {
            IsSpeaking = true;
            while (_lines.Count > 0)
            {
                var line = _lines.Dequeue();
                LineStarted?.Invoke(line);
                var spoken = false;
                if (!string.IsNullOrEmpty(JarvisConfig.OpenAiKey))
                {
                    yield return Cloud(line, ok => spoken = ok);
                }
                if (!spoken)
                    spoken = AndroidSpeak(line);
                if (!spoken)
                    Debug.Log("[Jarvis] caption only: " + line);
                float hold = Mathf.Clamp(line.Length * 0.06f, 1.6f, 8f);
                float t = 0f;
                while (t < hold)
                {
                    if (_source.isPlaying)
                        t = 0f;
                    t += Time.deltaTime;
                    yield return null;
                    if (t > 12f)
                        break;
                }
            }
            IsSpeaking = false;
        }

        IEnumerator Cloud(string text, Action<bool> done)
        {
            var payload = "{\"model\":\"tts-1\",\"voice\":\"onyx\",\"response_format\":\"wav\",\"input\":" + JsonString(text) + "}";
            using (var req = new UnityWebRequest("https://api.openai.com/v1/audio/speech", UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(payload));
                req.downloadHandler = new DownloadHandlerAudioClip("https://api.openai.com/v1/audio/speech", AudioType.WAV);
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + JarvisConfig.OpenAiKey);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    Debug.Log("[Jarvis] cloud voice failed status=" + req.responseCode);
                    done(false);
                    yield break;
                }
                var clip = DownloadHandlerAudioClip.GetContent(req);
                if (clip == null)
                {
                    done(false);
                    yield break;
                }
                _source.clip = clip;
                _source.Play();
                done(true);
            }
        }

        bool AndroidSpeak(string text)
        {
            if (!_androidReady || _android == null || _android.engine == null)
                return false;
            try
            {
                _android.engine.Call<int>("speak", text, 0, null, "jarvis" + Time.frameCount);
                return true;
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] headset voice speak failed: " + e.Message);
                return false;
            }
        }

        public static string JsonString(string value)
        {
            if (value == null)
                return "\"\"";
            var sb = new StringBuilder(value.Length + 2);
            sb.Append('"');
            foreach (var c in value)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': break;
                    default: sb.Append(c); break;
                }
            }
            sb.Append('"');
            return sb.ToString();
        }

        void OnDestroy()
        {
            if (_android != null && _android.engine != null)
            {
                try { _android.engine.Call("shutdown"); } catch { }
                _android.engine.Dispose();
            }
        }
    }
}
