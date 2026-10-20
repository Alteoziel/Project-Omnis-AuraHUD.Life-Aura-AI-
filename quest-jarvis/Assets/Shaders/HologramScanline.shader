Shader "QuestJarvis/HologramScanline"
{
    Properties
    {
        _Color ("Color", Color) = (0.2, 0.95, 1, 0.88)
        _ScanFreq ("Scan Frequency", Float) = 26
        _ScanSpeed ("Scan Speed", Float) = 1.15
        _Rim ("Rim", Range(0.5, 8)) = 2.4
        _Dissolve ("Dissolve", Range(0, 1)) = 0
        _Brightness ("Brightness", Range(0, 6)) = 2.8
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Pass
        {
            // Additive-leaning blend so cyan reads in bright passthrough rooms.
            Blend SrcAlpha One
            ZWrite Off
            Cull Off
            Lighting Off
            ZTest LEqual

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            float4 _Color;
            float _ScanFreq;
            float _ScanSpeed;
            float _Rim;
            float _Dissolve;
            float _Brightness;

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 world : TEXCOORD0;
                float3 normal : TEXCOORD1;
                float3 viewDir : TEXCOORD2;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                float3 world = mul(unity_ObjectToWorld, v.vertex).xyz;
                o.world = world;
                o.normal = UnityObjectToWorldNormal(v.normal);
                o.viewDir = _WorldSpaceCameraPos - world;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float scan = frac(i.world.y * _ScanFreq - _Time.y * _ScanSpeed);
                float line = smoothstep(0.42, 0.50, scan) * smoothstep(0.68, 0.54, scan);
                float3 n = normalize(i.normal);
                float3 v = normalize(i.viewDir);
                float fres = pow(1.0 - saturate(dot(n, v)), _Rim);
                float keep = 1.0;
                if (_Dissolve > 0.001)
                {
                    float band = frac(i.world.y * 4.0 + _Dissolve * 3.0);
                    keep = step(band, 1.0 - _Dissolve);
                }
                if (_Dissolve > 0.98)
                    discard;
                // Base fill stays visible even without rim/scan contribution.
                float alpha = _Color.a * (0.55 + line * 0.55 + fres * 0.55) * keep;
                float3 col = _Color.rgb * _Brightness * (0.75 + fres * 1.1 + line * 0.65);
                return fixed4(col, saturate(alpha));
            }
            ENDCG
        }
    }
    FallBack "Unlit/Color"
}
