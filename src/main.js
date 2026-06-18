import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles.css";
import { initializeMockData } from "./api/mockApi";
import { restoreSession } from "./store/session";

initializeMockData();
restoreSession();

createApp(App).use(router).mount("#app");
