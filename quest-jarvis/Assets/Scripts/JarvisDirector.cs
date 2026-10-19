using System.Collections;
using System.Text.RegularExpressions;
using UnityEngine;

namespace QuestJarvis
{
    [DefaultExecutionOrder(100)]
    public class JarvisDirector : MonoBehaviour
    {
        public const string HeadsetLine = "That needs a new headset build. Plug the Quest in and update me over SideQuest. I have not done it.";

        static readonly string[] Snark =
        {
            "You rang. I was busy holding still, which is harder than it looks.",
            "I'm here. Make it quick. The furniture is more interesting.",
            "Yes. Still a hologram. Still taller than your excuses.",
            "Go on. I don't do small talk, but I do doors."
        };

        static readonly string[] HeadsetNeedles =
        {
            "eye track",
            "track my eyes",
            "add eye",
            "face track",
            "body track",
            "hand track",
            "track my hands",
            "add hand",
            "enable hand",
            "give yourself hands",
            "new sensor",
            "new permission",
            "add a permission",
            "change how you look",
            "change your body",
            "redraw",
            "new way of drawing",
            "draw you",
            "full body",
            "lip sync",
            "new camera"
        };

        HologramBody _body;
        JarvisSpeaker _speaker;
        JarvisVoice _voice;
        JarvisPanels _panels;
        JarvisRoom _room;
        int _snarkIndex;
        bool _started;

        void Start()
        {
            var bodyGo = new GameObject("Jarvis");
            _body = bodyGo.AddComponent<HologramBody>();
            _body.Build();
            _speaker = bodyGo.AddComponent<JarvisSpeaker>();
            _voice = bodyGo.AddComponent<JarvisVoice>();
            _panels = bodyGo.AddComponent<JarvisPanels>();
            _panels.Build(_body.Head != null ? _body.Head : bodyGo.transform);
            _room = gameObject.AddComponent<JarvisRoom>();
            _room.Bind(_body, _speaker);
            _voice.Heard += OnHeard;
            var cam = Camera.main;
            var forward = cam != null ? cam.transform.forward : Vector3.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.01f)
                forward = Vector3.forward;
            var spot = (cam != null ? cam.transform.position : Vector3.zero) + forward.normalized * 1.5f;
            spot.y = 0f;
            _body.StandAt(spot, cam != null ? cam.transform.position : Vector3.zero);
            StartCoroutine(Boot());
        }

        IEnumerator Boot()
        {
            yield return JarvisConfig.Load();
            JarvisMemory.Load();
            _voice.Begin();
            _started = true;
        }

        void OnHeard(string raw)
        {
            if (!_started || string.IsNullOrWhiteSpace(raw))
                return;
            var lower = raw.Trim().ToLowerInvariant();
            bool named = lower.Contains("jarvis");
            bool aimed = _body != null && _body.IsUserAimedAt();
            if (!named && !aimed)
            {
                Debug.Log("[Jarvis] stayed quiet");
                return;
            }

            var command = named
                ? Regex.Replace(lower, @"\bjarvis\b", " ")
                : lower;
            command = Regex.Replace(command, @"\s+", " ").Trim(' ', ',', '.', '!', '?');

            JarvisMemory.AddLine("you", raw.Trim());
            if (TrySearch(command, out var query))
            {
                StartCoroutine(DoSearch(query));
                return;
            }
            if (TryReminder(command, out var note))
            {
                _room.RemindAtDoor(note, _speaker, _panels);
                JarvisMemory.AddLine("jarvis", "door reminder: " + note);
                _body.SetTalking(true);
                return;
            }
            if (NeedsHeadsetBuild(command))
            {
                Reply(HeadsetLine);
                return;
            }
            Reply(NextSnark());
        }

        void Update()
        {
            if (_body == null || _speaker == null)
                return;
            _body.SetTalking(_speaker.IsSpeaking);
        }

        IEnumerator DoSearch(string query)
        {
            Reply("Looking that up.");
            string answer = null;
            yield return JarvisSearch.Run(query, value => answer = value);
            _panels.ShowSearch(query, answer);
            Reply(answer);
            JarvisMemory.AddLine("jarvis", answer);
        }

        void Reply(string line)
        {
            _speaker.Say(line);
            _panels.ShowCaption(line, Mathf.Clamp(line.Length * 0.08f, 3f, 10f));
            _body.SetTalking(true);
        }

        string NextSnark()
        {
            var line = Snark[_snarkIndex % Snark.Length];
            _snarkIndex++;
            JarvisMemory.AddLine("jarvis", line);
            return line;
        }

        static bool TrySearch(string command, out string query)
        {
            query = null;
            var match = Regex.Match(command, @"^(?:please\s+)?(?:search|look up)(?:\s+for)?\s+(.+)$");
            if (!match.Success)
                return false;
            query = match.Groups[1].Value.Trim();
            return query.Length > 0;
        }

        static bool TryReminder(string command, out string note)
        {
            note = null;
            var match = Regex.Match(command, @"^remind me at the door(?:\s+to)?\s*(.*)$");
            if (!match.Success)
                return false;
            note = match.Groups[1].Value.Trim();
            if (note.Length == 0)
                note = "You asked me to remind you, and then didn't say what.";
            return true;
        }

        static bool NeedsHeadsetBuild(string command)
        {
            if (string.IsNullOrEmpty(command))
                return false;
            foreach (var needle in HeadsetNeedles)
            {
                if (command.Contains(needle))
                    return true;
            }
            return false;
        }
    }
}
