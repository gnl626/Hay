// import { BASE_URL } from './api/api';
const { createProxyMiddleware } = require("http-proxy-middleware");

//cors 때문에 설정함. 프론트와 논의 필요
module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8080/",
      changeOrigin: true,
    })
  );
};
