// ==UserScript==
// @name         Bili千赞脚本
// @version      1.0.0
// @description  自动将直播间点赞数提交为1000次
// @author       WittF
// @license      MIT
// @include      /https?:\/\/live\.bilibili\.com\/(blanc\/)?\d+\??.*/
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?domain=bilibili.com
// @require      https://unpkg.com/ajax-hook@2.1.3/dist/ajaxhook.min.js
// @require      https://cdn.bootcss.com/blueimp-md5/2.12.0/js/md5.min.js
// @GitFork By https://github.com/boxie123/BilibiliLiveThousandLikesScript
// ==/UserScript==

(function() {
    'use strict';

    // 添加创建提示框的通用函数
    function createToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 999999;
            animation: fadeInOut ${duration}ms ease-in-out forwards;
        `;
        toast.textContent = message;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // 添加提示到页面
        document.body.appendChild(toast);
        
        // 指定时间后移除提示
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, duration);
    }

    // 获取CSRF token
    function getCsrf() {
        const matches = document.cookie.match(/bili_jct=([^;]+)/);
        return matches ? matches[1] : '';
    }
    
    // 获取用户UID
    function getUid() {
        const matches = document.cookie.match(/DedeUserID=([^;]+)/);
        return matches ? matches[1] : '';
    }

    // 自动发送千赞请求函数
    async function sendAutoThousandLikes() {
        try {
            console.log('[✨Bili千赞脚本] 正在测试千赞是否可用...');

            // 固定的目标直播间和主播
            const targetRoomId = '544853';
            const targetAnchorId = '686127';
            
            console.log('[✨Bili千赞脚本] 测试目标房间:', targetRoomId, '目标主播:', targetAnchorId);
            
            // 获取用户凭证
            const csrf = getCsrf();
            const uid = getUid();
            
            console.log('[✨Bili千赞脚本] 用户凭证检查 - CSRF:', csrf ? '已获取' : '未获取', 'UID:', uid ? '已获取' : '未获取');
            
            if (!csrf || !uid) {
                console.error('[✨Bili千赞脚本] 错误: 用户未登录，无法发送千赞请求');
                return;
            }
            
            // 构造请求参数
            const baseUrl = 'https://api.live.bilibili.com/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3';
            const params = {
                room_id: targetRoomId,
                anchor_id: targetAnchorId,
                uid: uid,
                click_time: '1000',
                like_time: Math.floor(Date.now() / 1000).toString(),
                csrf: csrf,
                csrf_token: csrf,
                visit_id: ''
            };
            
            console.log('[✨Bili千赞脚本] 测试请求参数:', params);
            
            // 获取签名
            console.log('[✨Bili千赞脚本] 正在获取WBI签名...');
            const wbiKeys = await getWbiKeys();
            if (!wbiKeys) {
                console.error('[✨Bili千赞脚本] 错误: 获取WBI Keys失败');
                return;
            }
            
            console.log('[✨Bili千赞脚本] 成功获取WBI Keys:', wbiKeys);
            
            // 构造带签名的请求URL
            const query = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
                
            const requestUrl = `${baseUrl}?${query}`;
            console.log('[✨Bili千赞脚本] 原始请求URL:', requestUrl);
            
            const signedUrl = await processRequest(requestUrl);
            console.log('[✨Bili千赞脚本] 签名后URL:', signedUrl);
            
            console.log('[✨Bili千赞脚本] 开始向直播间544853发送千赞测试...');
            
            // 发送请求
            const response = await fetch(signedUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://live.bilibili.com',
                    'Referer': `https://live.bilibili.com/${targetRoomId}`
                }
            });
            
            // 检查响应状态
            console.log('[✨Bili千赞脚本] 请求状态:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 解析响应
            const data = await response.json();
            console.log('[✨Bili千赞脚本] 响应数据:', data);
            
            // 检查结果
            if (data.code === 0) {
                console.log('[✨Bili千赞脚本] 测试千赞成功! 千赞请求成功提交');
            } else {
                console.error('[✨Bili千赞脚本] 测试千赞失败! 服务器返回错误:', data.message);
            }
        } catch (error) {
            console.error('[✨Bili千赞脚本] 测试千赞异常:', error);
        }
    }

    // 在页面加载后执行自动千赞
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendAutoThousandLikes);
    } else {
        // 稍微延迟执行，确保cookie等信息已加载
        setTimeout(sendAutoThousandLikes, 1000);
    }

    // WBI 签名相关常量和函数
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];

    // WBI Keys缓存
    let cachedWbiKeys = null;
    let lastWbiKeysFetch = 0;
    const WBI_KEYS_CACHE_DURATION = 600 * 1000; // 10分钟缓存

    // 对 imgKey 和 subKey 进行字符顺序打乱编码
    const getMixinKey = (orig) => mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);

    // 为请求参数进行 wbi 签名
    function encWbi(params, img_key, sub_key) {
        const mixin_key = getMixinKey(img_key + sub_key);
        const curr_time = Math.round(Date.now() / 1000);
        const chr_filter = /[!'()*]/g;

        Object.assign(params, { wts: curr_time });

        // 按照 key 重排参数
        const query = Object
            .keys(params)
            .sort()
            .map(key => {
                const value = params[key].toString().replace(chr_filter, '');
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .join('&');

        const wbi_sign = md5(query + mixin_key);
        return query + '&w_rid=' + wbi_sign;
    }

    // 获取最新的 img_key 和 sub_key
    async function getWbiKeys() {
        // 检查缓存
        const now = Date.now();
        if (cachedWbiKeys && (now - lastWbiKeysFetch) < WBI_KEYS_CACHE_DURATION) {
            return cachedWbiKeys;
        }

        try {
            const res = await fetch('https://api.bilibili.com/x/web-interface/nav');
            const { data: { wbi_img: { img_url, sub_url } } } = await res.json();

            cachedWbiKeys = {
                img_key: img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
                sub_key: sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'))
            };

            lastWbiKeysFetch = now;
            return cachedWbiKeys;
        } catch (error) {
            console.error('[✨Bili千赞脚本] 获取WBI Keys失败:', error);
            return null;
        }
    }

    // 处理请求URL的函数
    async function processRequest(url) {
        try {
            // 解析URL
            const urlObj = new URL(url);
            const params = Object.fromEntries(urlObj.searchParams);

            // 删除原有的 wts 和 w_rid
            delete params.wts;
            delete params.w_rid;

            // 修改点赞次数
            if (params.click_time) {
                params.click_time = '1000';
            }

            // 获取WBI Keys并添加签名
            const wbiKeys = await getWbiKeys();
            if (wbiKeys) {
                // 生成带签名的查询字符串
                const signedQuery = encWbi(params, wbiKeys.img_key, wbiKeys.sub_key);
                // 返回新的URL
                return `${urlObj.origin}${urlObj.pathname}?${signedQuery}`;
            }

            return url;
        } catch (error) {
            console.error('[✨Bili千赞脚本] URL处理失败:', error);
            return url;
        }
    }

    // 修改拦截Fetch请求的部分
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async function(...args) {
        const [resource, config] = args;

        if (typeof resource === 'string' && resource.includes('/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3')) {
            try {
                args[0] = await processRequest(resource);
                console.log('[✨Bili千赞脚本] 拦截到点赞请求:', {
                    原始URL: resource,
                    处理后URL: args[0]
                });
                
                console.log('[✨Bili千赞脚本] 收到点赞请求，修改为千赞...');
                
                // 发送请求并等待响应
                const response = await originalFetch.apply(this, args);
                const responseData = await response.clone().json();
                
                // 检查请求是否成功
                if (responseData.code === 0) {
                    console.log('[✨Bili千赞脚本] 点赞请求处理成功，已提交千赞');
                } else {
                    console.error('[✨Bili千赞脚本] 点赞请求处理失败:', responseData.message || '未知错误');
                }
                
                return response;
            } catch (error) {
                console.error('[✨Bili千赞脚本] Fetch请求处理失败:', error);
            }
        }

        return originalFetch.apply(this, args);
    };

    console.log('[✨Bili千赞脚本] 初始化完成');
})();
