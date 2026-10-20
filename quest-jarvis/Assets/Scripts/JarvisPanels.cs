using UnityEngine;
using UnityEngine.UI;

namespace QuestJarvis
{
    public class JarvisPanels : MonoBehaviour
    {
        Font _font;
        Canvas _caption;
        Text _captionText;
        Canvas _search;
        Text _searchText;
        Canvas _status;
        Text _statusText;
        float _captionUntil;
        float _statusUntil;

        public void Build(Transform follow)
        {
            _font = LoadFont();
            _caption = MakeCanvas("Caption", follow, new Vector2(900f, 180f), new Vector3(0f, 0.22f, 0.15f), 0.00085f);
            _captionText = MakeText(_caption.transform, 34, TextAnchor.MiddleCenter);
            _caption.gameObject.SetActive(false);

            _search = MakeCanvas("SearchPanel", follow, new Vector2(760f, 460f), new Vector3(0.55f, 0.05f, 0.05f), 0.0007f);
            _searchText = MakeText(_search.transform, 28, TextAnchor.UpperLeft);
            _search.gameObject.SetActive(false);

            // Camera-locked status so spawn failures are visible even if the body is off-screen.
            _status = MakeCameraStatus();
            _statusText = MakeText(_status.transform, 30, TextAnchor.MiddleCenter);
            _status.gameObject.SetActive(false);
        }

        Canvas MakeCameraStatus()
        {
            var go = new GameObject("SpawnStatus");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            var rect = go.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(820f, 120f);
            go.transform.localScale = Vector3.one * 0.001f;
            var bgGo = new GameObject("Plate");
            bgGo.transform.SetParent(go.transform, false);
            var bgRect = bgGo.AddComponent<RectTransform>();
            bgRect.anchorMin = Vector2.zero;
            bgRect.anchorMax = Vector2.one;
            bgRect.offsetMin = Vector2.zero;
            bgRect.offsetMax = Vector2.zero;
            var image = bgGo.AddComponent<Image>();
            image.color = new Color(0.01f, 0.08f, 0.12f, 0.55f);
            return canvas;
        }

        static Font LoadFont()
        {
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null)
                font = Font.CreateDynamicFontFromOSFont("Arial", 32);
            return font;
        }

        Canvas MakeCanvas(string name, Transform parent, Vector2 size, Vector3 localPos, float scale)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one * scale;
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            var rect = go.GetComponent<RectTransform>();
            rect.sizeDelta = size;
            var bgGo = new GameObject("Plate");
            bgGo.transform.SetParent(go.transform, false);
            var bgRect = bgGo.AddComponent<RectTransform>();
            bgRect.anchorMin = Vector2.zero;
            bgRect.anchorMax = Vector2.one;
            bgRect.offsetMin = Vector2.zero;
            bgRect.offsetMax = Vector2.zero;
            var image = bgGo.AddComponent<Image>();
            image.color = new Color(0.02f, 0.12f, 0.16f, 0.45f);
            return canvas;
        }

        Text MakeText(Transform parent, int size, TextAnchor anchor)
        {
            var go = new GameObject("Label");
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(18f, 14f);
            rect.offsetMax = new Vector2(-18f, -14f);
            var text = go.AddComponent<Text>();
            text.font = _font;
            text.fontSize = size;
            text.alignment = anchor;
            text.color = new Color(0.75f, 1f, 1f, 0.95f);
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        public void ShowCaption(string text, float seconds)
        {
            if (_caption == null)
                return;
            _captionText.text = text;
            _caption.gameObject.SetActive(true);
            _captionUntil = Time.time + seconds;
        }

        public void ShowStatus(string text, float seconds = 0f)
        {
            if (_status == null || _statusText == null)
                return;
            _statusText.text = text;
            _status.gameObject.SetActive(true);
            _statusUntil = seconds > 0f ? Time.time + seconds : float.PositiveInfinity;
            Debug.Log("[Jarvis] status: " + text);
        }

        public void ShowSearch(string query, string answer)
        {
            if (_search == null)
                return;
            _searchText.text = "Search\n" + query + "\n\n" + answer;
            _search.gameObject.SetActive(true);
        }

        public static GameObject DoorNote(Transform door, Vector3 worldPos, Quaternion worldRot, string text)
        {
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null)
                font = Font.CreateDynamicFontFromOSFont("Arial", 32);
            var root = new GameObject("DoorReminder");
            if (door != null)
            {
                root.transform.SetParent(door, true);
            }
            root.transform.position = worldPos;
            root.transform.rotation = worldRot;
            root.transform.localScale = Vector3.one * 0.00075f;
            var canvas = root.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            var rect = root.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(720f, 280f);
            var plate = new GameObject("Plate");
            plate.transform.SetParent(root.transform, false);
            var plateRect = plate.AddComponent<RectTransform>();
            plateRect.anchorMin = Vector2.zero;
            plateRect.anchorMax = Vector2.one;
            plateRect.offsetMin = Vector2.zero;
            plateRect.offsetMax = Vector2.zero;
            var image = plate.AddComponent<Image>();
            image.color = new Color(0.02f, 0.18f, 0.22f, 0.5f);
            var labelGo = new GameObject("Label");
            labelGo.transform.SetParent(root.transform, false);
            var labelRect = labelGo.AddComponent<RectTransform>();
            labelRect.anchorMin = Vector2.zero;
            labelRect.anchorMax = Vector2.one;
            labelRect.offsetMin = new Vector2(20f, 16f);
            labelRect.offsetMax = new Vector2(-20f, -16f);
            var label = labelGo.AddComponent<Text>();
            label.font = font;
            label.fontSize = 32;
            label.alignment = TextAnchor.MiddleCenter;
            label.color = new Color(0.7f, 1f, 1f, 0.95f);
            label.horizontalOverflow = HorizontalWrapMode.Wrap;
            label.text = "Door\n" + text;
            return root;
        }

        void LateUpdate()
        {
            var cam = JarvisCamera.Find();
            if (cam == null)
                return;
            if (_caption != null && _caption.gameObject.activeSelf)
            {
                _caption.transform.rotation = Quaternion.LookRotation(_caption.transform.position - cam.transform.position);
                if (Time.time > _captionUntil)
                    _caption.gameObject.SetActive(false);
            }
            if (_search != null && _search.gameObject.activeSelf)
                _search.transform.rotation = Quaternion.LookRotation(_search.transform.position - cam.transform.position);
            if (_status != null && _status.gameObject.activeSelf)
            {
                var forward = cam.transform.forward;
                forward.y = 0f;
                if (forward.sqrMagnitude < 0.01f)
                    forward = cam.transform.forward;
                forward.Normalize();
                _status.transform.position = cam.transform.position + forward * 1.05f + Vector3.up * 0.08f;
                _status.transform.rotation = Quaternion.LookRotation(_status.transform.position - cam.transform.position);
                if (Time.time > _statusUntil)
                    _status.gameObject.SetActive(false);
            }
        }
    }
}
