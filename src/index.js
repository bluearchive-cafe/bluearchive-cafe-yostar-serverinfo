import xxhash from "xxhash-wasm";

export default {
    async fetch(request, env, ctx) {
        const key = new URL(request.url).pathname.slice(1);
        const upstream = "https://yostar-serverinfo.bluearchiveyostar.com/" + key;
        const cafeDomain = "bluearchive.cafe";
        const yostarDomain = "bluearchiveyostar.com";
        const cafeAttributes = `Path=/; Domain=${cafeDomain}; Max-Age=2147483647`;
        const yostarAttributes = `Path=/; Domain=${yostarDomain}; Max-Age=2147483647`;
        const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });

        if (!key || key.includes("/") || !key.startsWith("r") || !key.endsWith(".json")) return await fetch(upstream);

        let serverinfo;
        let value = await env.SERVERINFO.get(key);
        if (!value) {
            const response = await fetch(upstream);
            const text = await response.text();
            const hash = (await xxhash()).h32(text).toString();
            serverinfo = JSON.parse(text);
            value = JSON.stringify(serverinfo, null, 2);
            await env.SERVERINFO.put(key, value);
            await env.SERVERINFO.put("info.hash", hash);
        } else serverinfo = JSON.parse(value);

        let uuid, preference;
        if ((request.headers.get("User-Agent") || "").includes("BestHTTP")) {
            uuid = request.headers.get("Cookie")?.split("uuid=")?.[1]?.split(";")?.[0];
            preference = uuid && JSON.parse(await env.PREFERENCE.get(uuid) || "null");
            if (!preference) {
                uuid = crypto.randomUUID();
                preference = { table: "cn", asset: "jp", media: "jp" };
                await env.PREFERENCE.put(uuid, JSON.stringify(preference));
                headers.append("Set-Cookie", `uuid=${uuid}; ${cafeAttributes}`);
                headers.append("Set-Cookie", `uuid=${uuid}; ${yostarAttributes}`);
            }
        }

        const ConnectionGroup = serverinfo.ConnectionGroups[0];
        const OverrideConnectionGroup = serverinfo.ConnectionGroups[0].OverrideConnectionGroups[1]
        const managementDataPath = uuid ? `/${uuid}` : "";
        const addressableCatalogPath = preference ? `/table=${preference.table}/asset=${preference.asset}/media=${preference.media}` : "";
        ConnectionGroup.ManagementDataUrl = ConnectionGroup.ManagementDataUrl.replace(yostarDomain, cafeDomain + managementDataPath);
        OverrideConnectionGroup.AddressablesCatalogUrlRoot = OverrideConnectionGroup.AddressablesCatalogUrlRoot.replace(yostarDomain, cafeDomain + addressableCatalogPath);
        return new Response(JSON.stringify(serverinfo, null, 2), { headers });
    },
};
