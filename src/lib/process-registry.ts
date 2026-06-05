// Global işlem yönetim kayıtları (Next.js server hafızasında kalır)
export const activeProcesses = new Set<string>()
export const cancelledProcesses = new Set<string>()
