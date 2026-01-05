function patchCnVoice(jsonString) {
  let data;
  try { data = JSON.parse(jsonString); } catch { return jsonString; }

  const walk = (obj) => {
    if (typeof obj === "string") {
      return obj.replace(
        "prod-clientpatch.bluearchive.cafe",
        "cn-voice.prod-clientpatch.bluearchive.cafe"
      );
    }
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) obj[key] = walk(obj[key]);
      return obj;
    }
    return obj;
  };

  const patched = walk(data);
  return JSON.stringify(patched, null, 2);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    const hostname = url.hostname;
    const emergency = request.headers.has("Emergency");
    const isCnVoice = hostname === "cn-voice.yostar-serverinfo.bluearchive.cafe";

    if (emergency) {
      const upstream = await fetch("https://yostar-serverinfo.bluearchiveyostar.com/" + key);
      if (!upstream.ok) return upstream;

      let serverinfo = await upstream.json();
      for (const connectionGroup of serverinfo.ConnectionGroups || []) {
        if (connectionGroup.ManagementDataUrl) {
          connectionGroup.ManagementDataUrl = connectionGroup.ManagementDataUrl.replace(
            "prod-noticeindex.bluearchiveyostar.com",
            "prod-noticeindex.bluearchive.cafe"
          );
        }
      }
      return new Response(JSON.stringify(serverinfo, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    if (!key || key.includes("/") || !key.startsWith("r") || !key.endsWith(".json"))
      return await fetch("https://yostar-serverinfo.bluearchiveyostar.com/" + key);

    let value = await env.SERVERINFO.get(key);
    if (value) {
      if (isCnVoice) value = patchCnVoice(value);
      return new Response(value, { headers: { "Content-Type": "application/json" } });
    }

    const upstream = await fetch("https://yostar-serverinfo.bluearchiveyostar.com/" + key);
    if (!upstream.ok) return upstream;

    let serverinfo = await upstream.json();
    for (const connectionGroup of serverinfo.ConnectionGroups || []) {
      if (connectionGroup.ManagementDataUrl) {
        connectionGroup.ManagementDataUrl = connectionGroup.ManagementDataUrl.replace(
          "prod-noticeindex.bluearchiveyostar.com",
          "prod-noticeindex.bluearchive.cafe"
        );
      }
      for (const overrideGroup of connectionGroup.OverrideConnectionGroups || []) {
        if (overrideGroup.Name !== "1.0" && overrideGroup.AddressablesCatalogUrlRoot) {
          overrideGroup.AddressablesCatalogUrlRoot = overrideGroup.AddressablesCatalogUrlRoot.replace(
            "prod-clientpatch.bluearchiveyostar.com",
            "prod-clientpatch.bluearchive.cafe"
          );
        }
      }
    }
    value = JSON.stringify(serverinfo, null, 2);
    ctx.waitUntil(env.SERVERINFO.put(key, value));
    if (isCnVoice) value = patchCnVoice(value);
    return new Response(value, { headers: { "Content-Type": "application/json" } });
  },
};
