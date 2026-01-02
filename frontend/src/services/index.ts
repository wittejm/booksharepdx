/**
 * Service selector - switches between demo data and API based on environment
 */

import * as demoDataService from './dataService';
import * as apiService from './apiService';

const USE_DEMO_DATA = import.meta.env.VITE_USE_DEMO_DATA === 'true';

// Export the appropriate service based on environment
export const authService = USE_DEMO_DATA ? demoDataService.authService : apiService.authService;
export const userService = USE_DEMO_DATA ? demoDataService.userService : apiService.userService;
export const postService = USE_DEMO_DATA ? demoDataService.postService : apiService.postService;
export const messageService = USE_DEMO_DATA ? demoDataService.messageService : apiService.messageService;
export const commentService = USE_DEMO_DATA ? demoDataService.commentService : apiService.commentService;
export const blockService = USE_DEMO_DATA ? demoDataService.blockService : apiService.blockService;
export const reportService = USE_DEMO_DATA ? demoDataService.reportService : apiService.reportService;
export const vouchService = USE_DEMO_DATA ? demoDataService.vouchService : apiService.vouchService;
export const notificationService = USE_DEMO_DATA ? demoDataService.notificationService : apiService.notificationService;
export const savedPostService = USE_DEMO_DATA ? demoDataService.savedPostService : apiService.savedPostService;
export const neighborhoodService = USE_DEMO_DATA ? demoDataService.neighborhoodService : apiService.neighborhoodService;
export const moderationActionService = USE_DEMO_DATA ? demoDataService.moderationActionService : apiService.moderationActionService;

console.log(`📡 Using ${USE_DEMO_DATA ? 'DEMO DATA' : 'API'} mode`);
