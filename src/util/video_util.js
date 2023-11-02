// 本地音视频信息, 用于 打开本地音视频流
export const mediaConstraints = {
    video: {width: 500, height: 300},
    audio: true //由于没有麦克风，所有如果请求音频，会报错，不过不会影响视频流播放
};
export const openLocalMedia = (callback) => {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
            callback(stream);
        })
}