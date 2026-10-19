using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestJarvis
{
    [DefaultExecutionOrder(50)]
    public class JarvisVoice : MonoBehaviour
    {
        public event Action<string> Heard;

        readonly Queue<string> _pending = new Queue<string>();
        bool _useWhisper;
        bool _listening;
        string _micDevice;
        AudioClip _mic;
        int _micRate = 16000;
        int _lastSample;
        float _speechStart = -1f;
        float _lastVoice;
        readonly List<float> _utterance = new List<float>(16000 * 8);
        AndroidJavaObject _recognizer;
        RecognitionProxy _proxy;
        bool _recognizerRunning;

        class RecognitionProxy : AndroidJavaProxy
        {
            public readonly Queue<string> lines = new Queue<string>();
            public int hardErrors;
            public volatile bool cycleDone;
            public RecognitionProxy() : base("android.speech.RecognitionListener") { }
            public void onReadyForSpeech(AndroidJavaObject bundle) { }
            public void onBeginningOfSpeech() { }
            public void onRmsChanged(float rms) { }
            public void onBufferReceived(byte[] buffer) { }
            public void onEndOfSpeech() { }
            public void onError(int error)
            {
                if (error != 6 && error != 7)
                    hardErrors++;
                cycleDone = true;
            }
            public void onResults(AndroidJavaObject results)
            {
                var text = FirstString(results);
                if (!string.IsNullOrEmpty(text))
                {
                    lock (lines)
                        lines.Enqueue(text);
                }
                cycleDone = true;
            }
            public void onPartialResults(AndroidJavaObject partial) { }
            public void onEvent(int type, AndroidJavaObject bundle) { }

            static string FirstString(AndroidJavaObject results)
            {
                if (results == null)
                    return null;
                try
                {
                    var list = results.Call<AndroidJavaObject>("getStringArrayList", "results_recognition");
                    if (list == null)
                        return null;
                    var size = list.Call<int>("size");
                    if (size <= 0)
                        return null;
                    return list.Call<string>("get", 0);
                }
                catch
                {
                    return null;
                }
            }
        }

        void Update()
        {
            if (_proxy != null)
            {
                lock (_proxy.lines)
                {
                    while (_proxy.lines.Count > 0)
                        _pending.Enqueue(_proxy.lines.Dequeue());
                }
                if (_proxy.hardErrors >= 2 && !_useWhisper)
                {
                    Debug.Log("[Jarvis] speech service failed, switching to cloud transcription");
                    _useWhisper = true;
                    StopRecognizer();
                    BeginMic();
                }
            }
            while (_pending.Count > 0)
            {
                var line = _pending.Dequeue();
                Debug.Log("[Jarvis] heard chars=" + line.Length);
                if (Heard != null)
                    Heard(line);
            }
        }

        public void Begin()
        {
            if (_listening)
                return;
            _listening = true;
            StartCoroutine(Boot());
        }

        IEnumerator Boot()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Microphone))
            {
                UnityEngine.Android.Permission.RequestUserPermission(UnityEngine.Android.Permission.Microphone);
                float waited = 0f;
                while (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Microphone) && waited < 25f)
                {
                    waited += Time.deltaTime;
                    yield return null;
                }
            }
            if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Microphone))
            {
                Debug.Log("[Jarvis] microphone permission denied");
                yield break;
            }
#endif
            while (!JarvisConfig.Ready)
                yield return null;

            if (TryStartRecognizer())
            {
                Debug.Log("[Jarvis] using headset speech recognizer");
                yield break;
            }
            _useWhisper = true;
            BeginMic();
            if (string.IsNullOrEmpty(JarvisConfig.OpenAiKey))
                Debug.Log("[Jarvis] no speech recognizer and no cloud key");
            else
                Debug.Log("[Jarvis] using cloud transcription");
        }

        bool TryStartRecognizer()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var cls = new AndroidJavaClass("android.speech.SpeechRecognizer"))
                {
                    var available = cls.CallStatic<bool>("isRecognitionAvailable", CurrentActivity());
                    if (!available)
                        return false;
                    _proxy = new RecognitionProxy();
                    _recognizer = cls.CallStatic<AndroidJavaObject>("createSpeechRecognizer", CurrentActivity());
                    _recognizer.Call("setRecognitionListener", _proxy);
                    StartListening();
                    _recognizerRunning = true;
                    StartCoroutine(KeepRecognizerAlive());
                    return true;
                }
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] recognizer unavailable: " + e.Message);
                return false;
            }
#else
            return false;
#endif
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        static AndroidJavaObject CurrentActivity()
        {
            using (var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                return player.GetStatic<AndroidJavaObject>("currentActivity");
        }

        void StartListening()
        {
            using (var intent = new AndroidJavaObject("android.content.Intent", "android.speech.action.RECOGNIZE_SPEECH"))
            {
                intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.LANGUAGE_MODEL", "free_form");
                intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.PARTIAL_RESULTS", false);
                intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.MAX_RESULTS", 3);
                intent.Call<AndroidJavaObject>("putExtra", "android.speech.extra.LANGUAGE", "en-US");
                _recognizer.Call("startListening", intent);
            }
        }

        IEnumerator KeepRecognizerAlive()
        {
            while (_recognizerRunning && !_useWhisper && _proxy != null)
            {
                float waited = 0f;
                while (!_proxy.cycleDone && waited < 18f && _recognizerRunning)
                {
                    waited += Time.deltaTime;
                    yield return null;
                }
                if (!_recognizerRunning || _useWhisper || _proxy.hardErrors >= 2)
                    yield break;
                _proxy.cycleDone = false;
                try
                {
                    StartListening();
                }
                catch (Exception e)
                {
                    Debug.Log("[Jarvis] recognizer restart: " + e.Message);
                    _proxy.hardErrors++;
                }
            }
        }
#endif

        void StopRecognizer()
        {
            _recognizerRunning = false;
            if (_recognizer == null)
                return;
            try { _recognizer.Call("destroy"); } catch { }
            _recognizer.Dispose();
            _recognizer = null;
        }

        void BeginMic()
        {
            if (Microphone.devices == null || Microphone.devices.Length == 0)
            {
                Debug.Log("[Jarvis] no microphone device");
                return;
            }
            _micDevice = Microphone.devices[0];
            _mic = Microphone.Start(_micDevice, true, 12, _micRate);
            _lastSample = 0;
            StartCoroutine(VadLoop());
        }

        IEnumerator VadLoop()
        {
            while (_useWhisper && _mic != null)
            {
                int pos = Microphone.GetPosition(_micDevice);
                if (pos < 0 || _mic.samples <= 0)
                {
                    yield return null;
                    continue;
                }
                int samplesInClip = _mic.samples;
                int available = (pos - _lastSample + samplesInClip) % samplesInClip;
                while (available > 0)
                {
                    int untilEnd = samplesInClip - _lastSample;
                    int count = Mathf.Min(available, Mathf.Min(2048, untilEnd));
                    if (count <= 0)
                        break;
                    var chunk = new float[count];
                    _mic.GetData(chunk, _lastSample);
                    _lastSample = (_lastSample + count) % samplesInClip;
                    available -= count;
                    float sum = 0f;
                    for (int i = 0; i < count; i++)
                        sum += chunk[i] * chunk[i];
                    float rms = Mathf.Sqrt(sum / Mathf.Max(1, count));
                    bool voice = rms > 0.015f;
                    if (voice)
                    {
                        if (_speechStart < 0f)
                            _speechStart = Time.time;
                        _lastVoice = Time.time;
                        _utterance.AddRange(chunk);
                    }
                    else if (_speechStart > 0f)
                    {
                        _utterance.AddRange(chunk);
                        bool ended = Time.time - _lastVoice > 0.75f;
                        bool tooLong = _utterance.Count > _micRate * 8;
                        if (ended || tooLong)
                        {
                            var samples = _utterance.ToArray();
                            _utterance.Clear();
                            float started = _speechStart;
                            _speechStart = -1f;
                            if (Time.time - started > 0.35f && !string.IsNullOrEmpty(JarvisConfig.OpenAiKey))
                                yield return Transcribe(samples);
                        }
                    }
                }
                yield return null;
            }
        }

        IEnumerator Transcribe(float[] samples)
        {
            var wav = EncodeWav(samples, _micRate);
            var form = new List<IMultipartFormSection>
            {
                new MultipartFormFileSection("file", wav, "speech.wav", "audio/wav"),
                new MultipartFormDataSection("model", "whisper-1"),
                new MultipartFormDataSection("language", "en"),
                new MultipartFormDataSection("prompt", "Jarvis. Jarvis, search. Jarvis, remind me at the door.")
            };
            using (var req = UnityWebRequest.Post("https://api.openai.com/v1/audio/transcriptions", form))
            {
                req.SetRequestHeader("Authorization", "Bearer " + JarvisConfig.OpenAiKey);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    Debug.Log("[Jarvis] transcription failed status=" + req.responseCode);
                    yield break;
                }
                var text = Extract(req.downloadHandler.text, "text");
                if (!string.IsNullOrEmpty(text))
                    _pending.Enqueue(text);
            }
        }

        static string Extract(string json, string key)
        {
            if (string.IsNullOrEmpty(json))
                return null;
            var token = "\"" + key + "\":";
            int i = json.IndexOf(token, StringComparison.Ordinal);
            if (i < 0)
                return null;
            i += token.Length;
            while (i < json.Length && char.IsWhiteSpace(json[i]))
                i++;
            if (i >= json.Length || json[i] != '"')
                return null;
            i++;
            var sb = new StringBuilder();
            while (i < json.Length)
            {
                char c = json[i++];
                if (c == '\\' && i < json.Length)
                {
                    char n = json[i++];
                    if (n == 'n') sb.Append(' ');
                    else sb.Append(n);
                    continue;
                }
                if (c == '"')
                    break;
                sb.Append(c);
            }
            return sb.ToString().Trim();
        }

        static byte[] EncodeWav(float[] samples, int rate)
        {
            int count = samples.Length;
            var bytes = new byte[44 + count * 2];
            void W(int o, string s) { for (int i = 0; i < s.Length; i++) bytes[o + i] = (byte)s[i]; }
            W(0, "RIFF");
            WriteInt(bytes, 4, 36 + count * 2);
            W(8, "WAVE");
            W(12, "fmt ");
            WriteInt(bytes, 16, 16);
            WriteShort(bytes, 20, 1);
            WriteShort(bytes, 22, 1);
            WriteInt(bytes, 24, rate);
            WriteInt(bytes, 28, rate * 2);
            WriteShort(bytes, 32, 2);
            WriteShort(bytes, 34, 16);
            W(36, "data");
            WriteInt(bytes, 40, count * 2);
            int p = 44;
            for (int i = 0; i < count; i++)
            {
                short s = (short)Mathf.Clamp(samples[i] * 32767f, short.MinValue, short.MaxValue);
                bytes[p++] = (byte)(s & 0xff);
                bytes[p++] = (byte)((s >> 8) & 0xff);
            }
            return bytes;
        }

        static void WriteInt(byte[] b, int o, int v)
        {
            b[o] = (byte)v; b[o + 1] = (byte)(v >> 8); b[o + 2] = (byte)(v >> 16); b[o + 3] = (byte)(v >> 24);
        }

        static void WriteShort(byte[] b, int o, int v)
        {
            b[o] = (byte)v; b[o + 1] = (byte)(v >> 8);
        }

        void OnDestroy()
        {
            StopRecognizer();
            if (!string.IsNullOrEmpty(_micDevice))
                Microphone.End(_micDevice);
        }
    }
}
