using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace QuestJarvis
{
    public class JarvisTimer : MonoBehaviour
    {
        class Entry
        {
            public string label;
            public float endsAt;
        }

        readonly List<Entry> _active = new List<Entry>();
        JarvisSpeaker _speaker;
        JarvisPanels _panels;

        public void Bind(JarvisSpeaker speaker, JarvisPanels panels)
        {
            _speaker = speaker;
            _panels = panels;
        }

        public void StartMinutes(float minutes, string label)
        {
            if (minutes <= 0f)
                minutes = 1f;
            _active.Add(new Entry
            {
                label = string.IsNullOrWhiteSpace(label) ? "Timer" : label.Trim(),
                endsAt = Time.time + minutes * 60f
            });
            var name = string.IsNullOrWhiteSpace(label) ? "Timer" : label.Trim();
            var line = name + " timer started. " + minutes + " minute" + (minutes == 1f ? "" : "s") + ".";
            if (_speaker != null)
                _speaker.Say(line);
            if (_panels != null)
                _panels.ShowCaption(line, 4f);
        }

        void Update()
        {
            for (int i = _active.Count - 1; i >= 0; i--)
            {
                if (Time.time < _active[i].endsAt)
                    continue;
                var entry = _active[i];
                _active.RemoveAt(i);
                var line = entry.label + " timer done.";
                if (_speaker != null)
                    _speaker.Say(line);
                if (_panels != null)
                    _panels.ShowCaption(line, 6f);
                JarvisMemory.AddLine("jarvis", line);
            }
        }
    }
}
