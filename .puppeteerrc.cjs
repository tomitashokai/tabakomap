/**
 * puppeteer はローカルでの目視検証にしか使わないので、バンドル Chromium（約200MB）は
 * 落とさず、端末にインストール済みの Chrome を channel: 'chrome' で使う。
 *
 * これが無いと devDependencies の install 時に Chromium のダウンロードが走り、
 * Vercel のビルドでも毎回ダウンロードされてしまう。
 */
module.exports = {
  skipDownload: true,
};
