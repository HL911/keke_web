import { initializeDatabase } from "../app/api/utils/db-core";

/**
 * 应用启动时的数据库初始化
 */
export async function initDatabaseOnStartup() {
  try {
    console.log("Initializing database on startup...");

    // 初始化数据库（如果不存在会创建，如果存在会连接）
    await initializeDatabase();

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database on startup:", error);
    // 在生产环境中，你可能想要在这里抛出错误或采取其他措施
  }
}

/**
 * 在开发环境中自动初始化数据库
 */
if (process.env.NODE_ENV === "development") {
  // 延迟初始化，确保 Next.js 完全启动
  setTimeout(() => {
    initDatabaseOnStartup();
  }, 1000);
}
