export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const key = url.pathname.slice(1);
        const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
        const emergency = request.headers.has("Emergency");

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
            return new Response(JSON.stringify(serverinfo, null, 2), { headers });
        }

        if (!key || key.includes("/") || !key.startsWith("r") || !key.endsWith(".json"))
            return await fetch("https://yostar-serverinfo.bluearchiveyostar.com/" + key);

        let value = await env.SERVERINFO.get(key);
        if (value) return new Response(value, { headers });

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
        return new Response(value, { headers });
    },
};
