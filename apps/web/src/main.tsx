import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp, theme as antTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import "./styles/globals.css";
import "./i18n";

dayjs.locale("zh-cn");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("missing #root");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#3b5998",
          colorLink: "#3b5998",
          borderRadius: 4,
          fontSize: 14
        },
        components: {
          Layout: {
            siderBg: "#001529",
            headerBg: "#ffffff",
            triggerBg: "#002140"
          },
          Menu: {
            darkItemBg: "#001529",
            darkSubMenuItemBg: "#000c17",
            darkItemSelectedBg: "#3b5998"
          }
        }
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
