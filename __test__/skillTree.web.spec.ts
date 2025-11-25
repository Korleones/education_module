/**
 * Web E2E Test for Skill Tree Feature
 * Using Playwright for web platform testing
 */

import { test, expect } from '@playwright/test';

test.describe('Skill Tree Web E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8081');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // ⭐ IMPORTANT: Select a student first (required for skill tree data)
    // Go to Me tab and select a student
    await page.getByText('Me').click();
    await expect(page.getByText('👩‍🎓 Select a Student')).toBeVisible({ timeout: 3000 });
    
    // Select the first student (Y3_U1)
    const firstStudent = page.getByText('Y3_U1').first();
    await firstStudent.click();
    
    // Wait a moment for the selection to be saved to AsyncStorage
    await page.waitForTimeout(500);
  });

  test('should navigate from home to skill tree page', async ({ page }) => {
    // Step 1: Verify we're on the home page
    await expect(page.getByText('🏠 Homepage')).toBeVisible({ timeout: 5000 });

    // Step 2: Navigate to the navigation tab
    await page.getByText('Rec').click();

    // Step 3: Verify we're on the navigation screen
    await expect(page.getByText('🌿 Skill Tree')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('🎯 Recommender System')).toBeVisible();
    await expect(page.getByText('🌌 Constellation Chart')).toBeVisible();

    // Step 4: Click on Skill Tree button
    await page.getByText('🌿 Skill Tree').click();

    // Step 5: Verify we're on the Skill Tree page
    await expect(page.getByText('Complete Skill Tree')).toBeVisible({ timeout: 5000 });
  });

  test('should display header with student information', async ({ page }) => {
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    await expect(page.getByText('Complete Skill Tree')).toBeVisible();
    await expect(page.getByTestId('skill-tree-header')).toBeVisible();
  });

  test('should display statistics at the bottom', async ({ page }) => {
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Verify stats section
    await expect(page.getByText('Earned')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Available')).toBeVisible();
    await expect(page.getByText('Locked')).toBeVisible();
  });

  test('should support zoom via mouse wheel', async ({ page }) => {
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Wait for tree to load
    await expect(page.getByText('Complete Skill Tree')).toBeVisible();
    
    // Get the canvas element
    const canvas = page.getByTestId('skill-tree-visualizer');
    
    // Simulate mouse wheel zoom (web-specific feature)
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.mouse.wheel(0, 100);  // Zoom out
    
    // Tree should still be visible
    await expect(page.getByText('Complete Skill Tree')).toBeVisible();
  });

  test('should navigate back when back button is clicked', async ({ page }) => {
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Click back button
    await page.getByText('Back').click();
    
    // Should be back on navigation screen
    await expect(page.getByText('🌿 Skill Tree')).toBeVisible({ timeout: 3000 });
  });

  test('should maintain student selection across navigation', async ({ page }) => {
    // Student already selected in beforeEach (Y3_U1)
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Verify the selected student is shown
    await expect(page.getByText('Y3_U1')).toBeVisible({ timeout: 5000 });
    
    // Navigate back to profile
    await page.getByText('Back').click();
    await page.getByText('Home').click();
    await page.getByText('Me').click();
    
    // Change to a different student
    await page.getByText('Y5_U1').first().click();
    await page.waitForTimeout(500);
    
    // Navigate to skill tree again
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Verify the new selected student is shown
    await expect(page.getByText('Y5_U1')).toBeVisible({ timeout: 5000 });
  });

  test('should display legend', async ({ page }) => {
    // Navigate to skill tree
    await page.getByText('Rec').click();
    await page.getByText('🌿 Skill Tree').click();
    
    // Verify legend items
    await expect(page.getByText('Legend')).toBeVisible();
    await expect(page.getByText('Progression')).toBeVisible();
    await expect(page.getByText('Reinforcement')).toBeVisible();
    await expect(page.getByText('Skill Chain')).toBeVisible();
  });
});

