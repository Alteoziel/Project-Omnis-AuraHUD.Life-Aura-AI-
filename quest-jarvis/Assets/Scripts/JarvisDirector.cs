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
        JarvisTimer _timer;
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
            _timer = bodyGo.AddComponent<JarvisTimer>();
            _timer.Bind(_speaker, _panels);
            _room = gameObject.AddComponent<JarvisRoom>();
            _room.Bind(_body, _speaker, _panels);
            _voice.Heard += OnHeard;
            _speaker.LineStarted += line => _panels.ShowSaying(line);

            if (JarvisCamera.TryFrontFloor(JarvisCamera.PreferredStandMeters, 0f, false, out var floor, out var look))
            {
                _body.StandAt(floor, look);
                Debug.Log("[Jarvis] director cold spawn floor=" + floor);
                _panels.ShowStatus("Jarvis: placing hologram…", 3f);
            }
            else
            {
                _body.StandAt(new Vector3(0f, 0f, JarvisCamera.PreferredStandMeters), Vector3.zero);
                Debug.LogWarning("[Jarvis] director cold spawn — no XR camera yet");
                _panels.ShowStatus("Jarvis: waiting for XR camera…");
            }
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

            _panels.ShowHeard(raw.Trim());

            var command = named
                ? Regex.Replace(lower, @"\bjarvis\b", " ")
                : lower;
            command = Regex.Replace(command, @"\s+", " ").Trim(' ', ',', '.', '!', '?');

            JarvisMemory.AddLine("you", raw.Trim());
            if (TryBrief(command))
            {
                StartCoroutine(DoBrief());
                return;
            }
            if (TryRemember(command, out var memory))
            {
                JarvisMemory.AddNote(memory);
                Reply("Noted. " + memory);
                return;
            }
            if (TryPriority(command, out var slot, out var priority))
            {
                JarvisMemory.SetPriority(slot, priority);
                Reply("Priority " + (slot + 1) + " is " + priority + ".");
                return;
            }
            if (TryPlaceReminder(command, out var place, out var note))
            {
                _room.RemindAt(place, note, _speaker, _panels);
                JarvisMemory.AddLine("jarvis", place + " reminder: " + note);
                _body.SetTalking(true);
                return;
            }
            if (TrySearch(command, out var query))
            {
                StartCoroutine(DoSearch(query));
                return;
            }
            if (TryTimer(command, out var minutes, out var label))
            {
                _timer.StartMinutes(minutes, label);
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

        IEnumerator DoBrief()
        {
            Reply("One sec. Briefing.");
            string spoken = null;
            string panel = null;
            yield return JarvisBrief.Compose((say, pane) =>
            {
                spoken = say;
                panel = pane;
            });
            _panels.ShowSearch("Morning brief", panel);
            Reply(spoken);
            JarvisMemory.AddLine("jarvis", spoken);
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

        static bool TryBrief(string command)
        {
            if (string.IsNullOrEmpty(command))
                return false;
            return command.Contains("brief me") || command.Contains("morning brief") || command == "brief";
        }

        static bool TryRemember(string command, out string note)
        {
            note = null;
            var match = Regex.Match(command, @"^remember(?:\s+that)?\s+(.+)$");
            if (!match.Success)
                return false;
            note = match.Groups[1].Value.Trim();
            return note.Length > 0;
        }

        static bool TryPriority(string command, out int slot, out string text)
        {
            slot = -1;
            text = null;
            var match = Regex.Match(command, @"^priority\s+(one|two|three|1|2|3)\s+(?:is\s+)?(.+)$");
            if (!match.Success)
                return false;
            var token = match.Groups[1].Value;
            slot = token == "one" || token == "1" ? 0 : token == "two" || token == "2" ? 1 : 2;
            text = match.Groups[2].Value.Trim();
            return text.Length > 0;
        }

        static bool TryPlaceReminder(string command, out string place, out string note)
        {
            place = null;
            note = null;
            var match = Regex.Match(command, @"^remind me at the\s+(door|fridge)(?:\s+to)?\s*(.*)$");
            if (!match.Success)
                return false;
            place = match.Groups[1].Value.Trim();
            note = match.Groups[2].Value.Trim();
            if (note.Length == 0)
                note = "You asked me to remind you, and then didn't say what.";
            return true;
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

        static bool TryTimer(string command, out float minutes, out string label)
        {
            minutes = 0f;
            label = "Timer";
            var match = Regex.Match(command, @"^timer(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(?:minute|minutes|min)(?:\s+(?:for\s+)?(.+))?$");
            if (!match.Success)
                return false;
            if (!float.TryParse(match.Groups[1].Value, out minutes))
                return false;
            var tail = match.Groups[2].Value.Trim();
            if (tail.Length > 0)
                label = tail;
            return minutes > 0f;
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
