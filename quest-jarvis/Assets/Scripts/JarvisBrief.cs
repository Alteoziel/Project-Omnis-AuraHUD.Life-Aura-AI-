using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestJarvis
{
    public static class JarvisBrief
    {
        public static IEnumerator Compose(Action<string, string> done)
        {
            string weather = null;
            yield return FetchWeather(value => weather = value);
            var panel = BuildPanel(weather);
            var spoken = BuildSpoken(weather);
            done(spoken, panel);
        }

        static string BuildSpoken(string weather)
        {
            var sb = new StringBuilder();
            sb.Append("Morning brief. ");
            sb.Append(DateTime.Now.ToString("dddd, h:mm tt")).Append(". ");
            if (!string.IsNullOrWhiteSpace(weather))
                sb.Append(weather).Append(" ");
            sb.Append("Three things. ");
            for (int i = 0; i < 3; i++)
            {
                var item = JarvisMemory.Data.priorities != null && i < JarvisMemory.Data.priorities.Count
                    ? JarvisMemory.Data.priorities[i]
                    : "";
                if (string.IsNullOrWhiteSpace(item))
                    item = "Nothing set for slot " + (i + 1) + ". Say priority one, two, or three.";
                sb.Append(i + 1).Append(". ").Append(item).Append(" ");
            }
            return sb.ToString().Trim();
        }

        static string BuildPanel(string weather)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Brief");
            sb.AppendLine(DateTime.Now.ToString("dddd, MMM d · h:mm tt"));
            if (!string.IsNullOrWhiteSpace(weather))
                sb.AppendLine(weather);
            sb.AppendLine();
            for (int i = 0; i < 3; i++)
            {
                var item = JarvisMemory.Data.priorities != null && i < JarvisMemory.Data.priorities.Count
                    ? JarvisMemory.Data.priorities[i]
                    : "";
                sb.AppendLine((i + 1) + ". " + (string.IsNullOrWhiteSpace(item) ? "—" : item));
            }
            return sb.ToString().TrimEnd();
        }

        static IEnumerator FetchWeather(Action<string> done)
        {
            var url = "https://wttr.in/?format=3";
            using (var req = UnityWebRequest.Get(url))
            {
                req.SetRequestHeader("User-Agent", "QuestJarvis/1.0");
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    done(null);
                    yield break;
                }
                var body = req.downloadHandler.text;
                done(string.IsNullOrWhiteSpace(body) ? null : body.Trim());
            }
        }
    }
}
