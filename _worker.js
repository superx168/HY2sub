export default {
	async fetch(request, env, ctx) {
		let siteshy2 = [
			{ url: 'https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria2/config.json', type: "hysteria2" },
			{ url: 'https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria2/1/config.json',type: "hysteria2" },
			{ url: 'https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria2/2/config.json',type: "hysteria2"},
			{ url: 'https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria2/13/config.json',type: "hysteria2"},
			{ url: 'https://gitlab.com/free9999/ipupdate/-/raw/master/hysteria2/config.json',type: "hysteria2"},
			{ url: 'https://gitlab.com/free9999/ipupdate/-/raw/master/hysteria2/2/config.json',type: "hysteria2"},
		];

		let siteshy = [
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria/config.json", type: "hysteria" },
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria/1/config.json", type: "hysteria" },
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria/2/config.json", type: "hysteria" },
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/hysteria/13/config.json", type: "hysteria" },
			{ url: "https://gitlab.com/free9999/ipupdate/-/raw/master/hysteria/config.json", type: "hysteria" },
			{ url: "https://gitlab.com/free9999/ipupdate/-/raw/master/hysteria/2/config.json", type: "hysteria" },
		];

		let sitessb = [
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/singbox/config.json", type: "hysteria" },
			{ url: "https://raw.githubusercontent.com/Alvin9999/pac2/master/singbox/1/config.json", type: "hysteria" },
			{ url: "https://gitlab.com/free9999/ipupdate/-/raw/master/singbox/config.json",type: "hysteria"},
		];

		let responses = []; //订阅集合

		for (const site of siteshy2) {
			try {
				let response = await fetch(site.url);
				if (response.ok) {
					let data = await response.json();
					let processedData = await processHysteria2(data);
					if (processedData) {
					responses.push(processedData);
					}
				} else {
					console.error(`Failed to fetch data from ${site.url}, status: ${response.status}`);
				}
			} catch (error) {
				console.error(`Error fetching data from ${site.url}:`, error);
				continue;
			}
		}

		for (const site of siteshy) {
			try {
				let response = await fetch(site.url);
				if (response.ok) {
					let data = await response.json();
					let processedData = await processHysteri(data);
					if (processedData) {
					responses.push(processedData);
					}
				} else {
					console.error(`Failed to fetch data from ${site.url}, status: ${response.status}`);
				}
			} catch (error) {
				console.error(`Error fetching data from ${site.url}:`, error);
				continue;
			}
		}

		for (const site of sitessb) {
			try {
				let response = await fetch(site.url);
				if (response.ok) {
					let data = await response.json();
					let processedData = await processSingbox(data);
					if (processedData) {
					responses.push(processedData);
					}
				} else {
					console.error(`Failed to fetch data from ${site.url}, status: ${response.status}`);
				}
			} catch (error) {
				console.error(`Error fetching data from ${site.url}:`, error);
				continue;
			}
		}

		// 去重
		let uniqueResponses = removeDuplicates(responses);

		// 将去重后的数据合并成一个字符串
		const combinedString = uniqueResponses.join('\n');
		// 对合并后的字符串进行 Base64 编码
		const base64EncodedString = btoa(unescape(encodeURIComponent(combinedString)));

		return new Response(base64EncodedString, {
			headers: { 'content-type': 'text/plain; charset=utf-8' },
		});
	}
};

async function processHysteria2(data) {
	const auth = data.auth || '';
	const server = data.server || '';
	const insecure = data.tls.insecure ? 1 : 0;
	const sni = data.tls.sni || '';
	const match = server.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
	const ip = match ? match[0] : '8.8.8.8';
	if (ip) {
		const locationInfo = await getLocationInfo(ip);
		const locationInfoEncoded = encodeURIComponent(locationInfo);
		return `hy2://${auth}@${server}?insecure=${insecure}&sni=${sni}#${locationInfoEncoded}`;
	}
	return null;
}

async function processHysteri(data) {
	const up_mps = data.up_mbps;
	const down_mps = data.down_mbps;
	const auth_Str = data.auth_str;
	const server_name = data.server_name;
	const alpn = data.alpn;
	const server = data.server;
	const match = server.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
	const ip = match ? match[0] : '8.8.8.8';
	if (ip) {
		const locationInfo = await getLocationInfo(ip);
		const locationInfoEncoded = encodeURIComponent(locationInfo);
		return `hysteria://${server}?upmbps=${up_mps}&downmbps=${down_mps}&auth=${auth_Str}&insecure=1&peer=${server_name}&alpn=${alpn}#${locationInfoEncoded}`;
	}
	return null;
}

async function processSingbox(data) {
	const outbounds = data.outbounds[0];
	const up_mps = outbounds.up_mbps;
	const down_mps = outbounds.down_mbps;
	const auth_Str = outbounds.auth_str;
	const server_name = outbounds.tls.server_name;
	const alpn = outbounds.tls.alpn[0];
	const server = outbounds.server;
	const port = outbounds.server_port;

	const locationInfo = await getLocationInfo(server);
	const locationInfoEncoded = encodeURIComponent(locationInfo);
	return `hysteria://${server}:${port}?upmbps=${up_mps}&downmbps=${down_mps}&auth=${auth_Str}&insecure=1&peer=${server_name}&alpn=${alpn}#${locationInfoEncoded}`;
	}

async function getLocationInfo(ip) {
	try {
		let response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.ok) {
			let data = await response.json();
			if (data.status === "success") {
				return `${data.countryCode} ${data.regionName} ${data.as}`;
			}
		}
	} catch (error) {
		console.error(`Error fetching location data for IP ${ip}:`, error);
	}
	return '';
}

// 去重函数
function removeDuplicates(responses) {
	return [...new Set(responses)];
}
