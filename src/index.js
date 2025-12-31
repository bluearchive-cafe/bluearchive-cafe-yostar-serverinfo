export default {
  async fetch(request, env, ctx) {
    const key = new URL(request.url).pathname.slice(1);
    if (!key || key.includes("/") || !key.startsWith("r") || !key.endsWith(".json"))
      return await fetch("https://yostar-serverinfo.bluearchiveyostar.com/" + key);

    let value = await env.SERVERINFO.get(key);
    if (value) return new Response(value, { headers: { "Content-Type": "application/json" } });

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
    return new Response(value, { headers: { "Content-Type": "application/json" } });
  },
};
