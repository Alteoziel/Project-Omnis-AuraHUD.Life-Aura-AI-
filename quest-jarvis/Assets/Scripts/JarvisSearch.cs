using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestJarvis
{
    public static class JarvisSearch
    {
        public static IEnumerator Run(string query, Action<string> done)
        {
            string answer = null;
            yield return Duck(query, value => answer = value);
            if (string.IsNullOrWhiteSpace(answer))
                yield return Wiki(query, value => answer = value);
            if (string.IsNullOrWhiteSpace(answer))
                yield return DuckHtml(query, value => answer = value);
            if (string.IsNullOrWhiteSpace(answer))
                answer = "I looked. The web did not give me a straight answer.";
            if (answer.Length > 380)
                answer = answer.Substring(0, 377).Trim() + "...";
            done(answer);
        }

        static IEnumerator Duck(string query, Action<string> done)
        {
            var url = "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + UnityWebRequest.EscapeURL(query);
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
                var answer = FirstNonEmpty(
                    Extract(body, "AbstractText"),
                    Extract(body, "Answer"),
                    Extract(body, "Definition"));
                if (string.IsNullOrWhiteSpace(answer))
                    answer = ExtractRelated(body);
                done(Clean(answer));
            }
        }

        static IEnumerator Wiki(string query, Action<string> done)
        {
            var search = "https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=" + UnityWebRequest.EscapeURL(query);
            string title = null;
            using (var req = UnityWebRequest.Get(search))
            {
                req.SetRequestHeader("User-Agent", "QuestJarvis/1.0");
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    done(null);
                    yield break;
                }
                title = SecondArrayString(req.downloadHandler.text);
            }
            if (string.IsNullOrEmpty(title))
            {
                done(null);
                yield break;
            }
            var summary = "https://en.wikipedia.org/api/rest_v1/page/summary/" + UnityWebRequest.EscapeURL(title);
            using (var req = UnityWebRequest.Get(summary))
            {
                req.SetRequestHeader("User-Agent", "QuestJarvis/1.0");
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    done(null);
                    yield break;
                }
                done(Clean(Extract(req.downloadHandler.text, "extract")));
            }
        }

        static IEnumerator DuckHtml(string query, Action<string> done)
        {
            var url = "https://lite.duckduckgo.com/lite/?q=" + UnityWebRequest.EscapeURL(query);
            using (var req = UnityWebRequest.Get(url))
            {
                req.SetRequestHeader("User-Agent", "QuestJarvis/1.0");
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    done(null);
                    yield break;
                }
                done(Clean(FirstSnippet(req.downloadHandler.text)));
            }
        }

        static string FirstSnippet(string html)
        {
            if (string.IsNullOrEmpty(html))
                return null;
            var marker = "result-snippet";
            int i = html.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (i < 0)
                return null;
            int gt = html.IndexOf('>', i);
            if (gt < 0)
                return null;
            int end = html.IndexOf('<', gt + 1);
            if (end < 0)
                return null;
            return html.Substring(gt + 1, end - gt - 1);
        }

        static string SecondArrayString(string json)
        {
            if (string.IsNullOrEmpty(json))
                return null;
            int first = json.IndexOf('[', 0);
            if (first < 0)
                return null;
            int second = json.IndexOf('[', first + 1);
            if (second < 0)
                return null;
            int quote = json.IndexOf('"', second + 1);
            if (quote < 0)
                return null;
            int end = json.IndexOf('"', quote + 1);
            if (end < 0)
                return null;
            return json.Substring(quote + 1, end - quote - 1);
        }

        static string ExtractRelated(string json)
        {
            var token = "\"Text\":";
            int i = json.IndexOf(token, StringComparison.Ordinal);
            if (i < 0)
                return null;
            return ExtractAt(json, i + token.Length);
        }

        static string Extract(string json, string key)
        {
            if (string.IsNullOrEmpty(json))
                return null;
            var token = "\"" + key + "\":";
            int i = json.IndexOf(token, StringComparison.Ordinal);
            if (i < 0)
                return null;
            return ExtractAt(json, i + token.Length);
        }

        static string ExtractAt(string json, int i)
        {
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
                    else if (n == 'u' && i + 3 < json.Length)
                    {
                        i += 4;
                        sb.Append(' ');
                    }
                    else sb.Append(n);
                    continue;
                }
                if (c == '"')
                    break;
                sb.Append(c);
            }
            return sb.ToString();
        }

        static string FirstNonEmpty(params string[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            }
            return null;
        }

        static string Clean(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;
            return value.Replace("&amp;", "&").Replace("&quot;", "\"").Replace("&#39;", "'").Replace("&lt;", "<").Replace("&gt;", ">").Trim();
        }
    }
}
