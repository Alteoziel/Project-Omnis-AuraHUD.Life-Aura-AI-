using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace QuestJarvis
{
    /// <summary>
    /// Conversations and reminders live outside the APK. An in-place update
    /// (same package name, no uninstall) does not replace these files.
    /// </summary>
    public static class JarvisMemory
    {
        [Serializable]
        public class Line
        {
            public long at;
            public string who;
            public string text;
        }

        [Serializable]
        public class Reminder
        {
            public string id;
            public string place;
            public string text;
            public long at;
        }

        [Serializable]
        public class Note
        {
            public string id;
            public string text;
            public long at;
        }

        [Serializable]
        public class FileBlob
        {
            public long savedAt;
            public List<Line> lines = new List<Line>();
            public List<Reminder> reminders = new List<Reminder>();
            public List<Note> notes = new List<Note>();
            public List<string> priorities = new List<string>();
        }

        public static FileBlob Data { get; private set; } = new FileBlob();

        public static void Load()
        {
            FileBlob best = null;
            foreach (var path in Paths())
            {
                var blob = Read(path);
                if (blob == null)
                    continue;
                if (best == null || blob.savedAt > best.savedAt)
                    best = blob;
            }
            Data = best ?? new FileBlob();
            if (Data.lines == null)
                Data.lines = new List<Line>();
            if (Data.reminders == null)
                Data.reminders = new List<Reminder>();
            if (Data.notes == null)
                Data.notes = new List<Note>();
            if (Data.priorities == null)
                Data.priorities = new List<string>();
            while (Data.priorities.Count < 3)
                Data.priorities.Add("");
            Debug.Log("[Jarvis] memory lines=" + Data.lines.Count + " reminders=" + Data.reminders.Count + " notes=" + Data.notes.Count);
        }

        public static void AddLine(string who, string text)
        {
            Data.lines.Add(new Line
            {
                at = Now(),
                who = who,
                text = text
            });
            if (Data.lines.Count > 200)
                Data.lines.RemoveAt(0);
            Save();
        }

        public static Note AddNote(string text)
        {
            var note = new Note
            {
                id = Guid.NewGuid().ToString("N"),
                text = text,
                at = Now()
            };
            Data.notes.Add(note);
            if (Data.notes.Count > 80)
                Data.notes.RemoveAt(0);
            Save();
            return note;
        }

        public static void SetPriority(int index, string text)
        {
            while (Data.priorities.Count < 3)
                Data.priorities.Add("");
            if (index < 0 || index >= 3)
                return;
            Data.priorities[index] = text ?? "";
            Save();
        }

        public static Reminder AddReminder(string place, string text)
        {
            var reminder = new Reminder
            {
                id = Guid.NewGuid().ToString("N"),
                place = place,
                text = text,
                at = Now()
            };
            Data.reminders.Add(reminder);
            Save();
            return reminder;
        }

        public static void Save()
        {
            Data.savedAt = Now();
            var json = JsonUtility.ToJson(Data);
            var wrote = 0;
            foreach (var path in Paths())
            {
                try
                {
                    var dir = Path.GetDirectoryName(path);
                    if (!string.IsNullOrEmpty(dir))
                        Directory.CreateDirectory(dir);
                    File.WriteAllText(path, json);
                    wrote++;
                }
                catch (Exception e)
                {
                    Debug.Log("[Jarvis] memory copy skipped: " + e.Message);
                }
            }
            Debug.Log("[Jarvis] memory saved copies=" + wrote);
        }

        static FileBlob Read(string path)
        {
            try
            {
                if (!File.Exists(path))
                    return null;
                var blob = JsonUtility.FromJson<FileBlob>(File.ReadAllText(path));
                return blob;
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] memory unreadable: " + e.Message);
                return null;
            }
        }

        static List<string> Paths()
        {
            var paths = new List<string>
            {
                Path.Combine(Application.persistentDataPath, "jarvis-memory.json")
            };
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                using (var activity = player.GetStatic<AndroidJavaObject>("currentActivity"))
                using (var files = activity.Call<AndroidJavaObject>("getFilesDir"))
                {
                    var root = files.Call<string>("getAbsolutePath");
                    paths.Add(Path.Combine(root, "jarvis-memory.json"));
                }
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] internal files dir unavailable: " + e.Message);
            }
            try
            {
                using (var env = new AndroidJavaClass("android.os.Environment"))
                {
                    var documents = env.GetStatic<string>("DIRECTORY_DOCUMENTS");
                    using (var dir = env.CallStatic<AndroidJavaObject>("getExternalStoragePublicDirectory", documents))
                    {
                        var root = dir.Call<string>("getAbsolutePath");
                        paths.Add(Path.Combine(root, "QuestJarvis", "jarvis-memory.json"));
                    }
                }
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] documents copy unavailable: " + e.Message);
            }
#endif
            return paths;
        }

        static long Now()
        {
            return DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        }
    }
}
