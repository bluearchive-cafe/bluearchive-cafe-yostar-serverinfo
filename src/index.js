export default {
    async fetch(request, env, ctx) {
        const key = new URL(request.url).pathname.slice(1);
        const upstream = `https://yostar-serverinfo.bluearchiveyostar.com/${key}`;
        const cafeDomain = "bluearchive.cafe";
        const yostarDomain = "bluearchiveyostar.com";
        const cafeAttributes = `Path=/; Domain=${cafeDomain}; Max-Age=2147483647`;
        const yostarAttributes = `Path=/; Domain=${yostarDomain}; Max-Age=2147483647`;
        const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

        let serverinfo;
        let response = await env.ASSETS.fetch(request);
        if (!response.ok) {
            response = await fetch(upstream);
            if (response.ok) {
                serverinfo = await response.json();
                ctx.waitUntil(
                    fetch(`https://api.github.com/repos/bluearchive-cafe/bluearchive-cafe-yostar-serverinfo/contents/public/${key}`, {
                        method: "PUT",
                        headers: { "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "Cloudflare Workers" },
                        body: JSON.stringify({ "message": `提交游戏资源信息：${key}`, "content": btoa(JSON.stringify(serverinfo, null, 2)) })
                    })
                );
            } else return response;
        } else serverinfo = await response.json();

        if ((request.headers.get("User-Agent") || "").includes("BestHTTP") && !request.headers.has("Emergency")) {
            let uuid = request.headers.get("Cookie")?.split("uuid=")?.[1]?.split(";")?.[0];
            let preference = uuid && JSON.parse(await env.PREFERENCE.get(uuid) || "null");
            if (!preference) {
                uuid = crypto.randomUUID();
                preference = { table: "cn", asset: "jp", media: "jp" };
                await env.PREFERENCE.put(uuid, JSON.stringify(preference));
                headers.append("Set-Cookie", `uuid=${uuid}; ${cafeAttributes}`);
                headers.append("Set-Cookie", `uuid=${uuid}; ${yostarAttributes}`);
            }
            const ConnectionGroup = serverinfo.ConnectionGroups[0];
            const OverrideConnectionGroup = serverinfo.ConnectionGroups[0].OverrideConnectionGroups[1];
            ConnectionGroup.ManagementDataUrl = ConnectionGroup.ManagementDataUrl.replace(yostarDomain, `${cafeDomain}/${uuid}`);
            OverrideConnectionGroup.AddressablesCatalogUrlRoot = preference.dev === "true"
                ? OverrideConnectionGroup.AddressablesCatalogUrlRoot.replace(`prod-clientpatch.${yostarDomain}`, `dev-clientpatch.${cafeDomain}`)
                : OverrideConnectionGroup.AddressablesCatalogUrlRoot.replace(yostarDomain, `${cafeDomain}/table=${preference.table}/asset=${preference.asset}/media=${preference.media}`);
        }

        return new Response(JSON.stringify(serverinfo, null, 2), { headers });
    },
};
