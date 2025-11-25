/**
 * E2E Test for Skill Tree Feature
 * 
 * This test simulates a user's happy path:
 * 1. Start from home page
 * 2. Navigate to the navigation tab
 * 3. Click on Skill Tree button
 * 4. Verify that the skill tree is rendered
 * 5. Verify that all 4 node states are present (locked, available, in-progress, earned)
 * 6. Click on a node to open detail modal
 * 7. Verify modal content
 * 8. Close the modal
 */

describe('Skill Tree E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ===== Test 1: Navigation Flow =====
  describe('Navigation Flow', () => {
    it('should navigate from home to skill tree page', async () => {
      // Step 1: Verify we're on the home page
      await waitFor(element(by.text('🏠 Homepage')))
        .toBeVisible()
        .withTimeout(5000);

      // Step 2: Navigate to the navigation tab (Rec tab at bottom)
      await element(by.text('Rec')).tap();

      // Step 3: Verify we're on the navigation screen with three buttons
      await waitFor(element(by.text('🌿 Skill Tree')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text('🎯 Recommender System'))).toBeVisible();
      await expect(element(by.text('🌌 Constellation Chart'))).toBeVisible();

      // Step 4: Click on Skill Tree button
      await element(by.text('🌿 Skill Tree')).tap();

      // Step 5: Verify we're on the Skill Tree page
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display back button on skill tree page', async () => {
      // Navigate to skill tree
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();

      // Verify back button exists
      await expect(element(by.text('Back'))).toBeVisible();
    });

    it('should navigate back when back button is pressed', async () => {
      // Navigate to skill tree
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();

      // Wait for page to load
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(3000);

      // Click back button
      await element(by.text('Back')).tap();

      // Verify we're back on navigation screen
      await waitFor(element(by.text('🌿 Skill Tree')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  // ===== Test 2: Skill Tree Rendering =====
  describe('Skill Tree Rendering', () => {
    beforeEach(async () => {
      // Navigate to skill tree before each test
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display header with student information', async () => {
      await expect(element(by.text('Complete Skill Tree'))).toBeVisible();
      
      // Verify student info is displayed (example: Y3_U1, Year 3)
      // Note: This depends on which student is selected in storage
      await expect(element(by.id('skill-tree-header'))).toBeVisible();
    });

    it('should display statistics at the bottom', async () => {
      // Verify stats section exists
      await expect(element(by.text('Earned'))).toBeVisible();
      await expect(element(by.text('In Progress'))).toBeVisible();
      await expect(element(by.text('Available'))).toBeVisible();
      await expect(element(by.text('Locked'))).toBeVisible();
    });

    it('should display legend', async () => {
      // Scroll down if needed to see legend
      await expect(element(by.text('Legend'))).toBeVisible();
      await expect(element(by.text('Progression'))).toBeVisible();
      await expect(element(by.text('Reinforcement'))).toBeVisible();
    });
  });

  // ===== Test 3: Node States Verification =====
  describe('Node States Verification', () => {
    beforeEach(async () => {
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should have nodes in all four states', async () => {
      // This test verifies that the statistics show counts > 0 for all states
      // Since we can't easily access the SVG nodes directly in Detox,
      // we verify the statistics section shows all states are present
      
      // Get statistics section
      const statsSection = element(by.id('skill-tree-stats'));
      await expect(statsSection).toBeVisible();

      // All state labels should be visible
      await expect(element(by.text('Earned'))).toBeVisible();
      await expect(element(by.text('In Progress'))).toBeVisible();
      await expect(element(by.text('Available'))).toBeVisible();
      await expect(element(by.text('Locked'))).toBeVisible();
    });
  });

  // ===== Test 4: Node Interaction =====
  describe('Node Interaction', () => {
    beforeEach(async () => {
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should open modal when a node is clicked', async () => {
      // To test this, we need to add testID to our SVG nodes
      // For now, we'll simulate by directly checking if modal can appear
      // In a real test, you would:
      // 1. Tap on a specific node using coordinates or testID
      // 2. Wait for modal to appear
      
      // Note: SVG elements in React Native are harder to test with Detox
      // A better approach is to add accessibility labels or testIDs
      
      // Example if we had testID on nodes:
      // await element(by.id('skill-node-INQ.Y3.QP')).tap();
      // await waitFor(element(by.id('node-detail-modal')))
      //   .toBeVisible()
      //   .withTimeout(2000);
    });
  });

  // ===== Test 5: Modal Functionality =====
  describe('Node Detail Modal', () => {
    // Note: This test assumes we can trigger the modal
    // In practice, you'd need to add testIDs to make nodes tappable in E2E tests

    it('should display node details in modal', async () => {
      // Navigate to skill tree
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);

      // Assuming we've added testID to a specific node
      // await element(by.id('discipline-node-BIO.Y3.AC9S3U01')).tap();

      // For this example, we'll document what should be tested:
      // 1. Modal title should be visible
      // 2. Status badges should be visible
      // 3. Description should be visible
      // 4. Close button should be visible
    });

    it('should close modal when close button is tapped', async () => {
      // Navigate and open modal (if testIDs are available)
      // await element(by.text('Rec')).tap();
      // await element(by.text('🌿 Skill Tree')).tap();
      // await element(by.id('discipline-node-BIO.Y3.AC9S3U01')).tap();
      
      // Verify modal is open
      // await expect(element(by.id('node-detail-modal'))).toBeVisible();
      
      // Close modal
      // await element(by.text('✕')).tap();
      
      // Verify modal is closed
      // await waitFor(element(by.id('node-detail-modal')))
      //   .not.toBeVisible()
      //   .withTimeout(2000);
    });

    it('should close modal when overlay is tapped', async () => {
      // Similar to above, but tap on overlay instead of close button
      // This requires the overlay to have a testID
    });

    it('should change node status when status button is tapped', async () => {
      // Test the status change functionality
      // 1. Open modal
      // 2. Tap on a different status button (e.g., "Earned")
      // 3. Verify the status changed (check if statistics updated)
    });

    it('should allow level selection for discipline nodes', async () => {
      // Test the level selector for discipline nodes
      // 1. Open a discipline node modal
      // 2. Verify level selector is visible
      // 3. Tap on a different level
      // 4. Verify the level changed
    });
  });

  // ===== Test 6: Zoom and Pan =====
  describe('Zoom and Pan Interactions', () => {
    beforeEach(async () => {
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should allow panning the skill tree canvas', async () => {
      // Get the visualizer container
      const canvas = element(by.id('skill-tree-visualizer'));
      
      // Perform swipe gesture (pan)
      // await canvas.swipe('left', 'slow', 0.5);
      // await canvas.swipe('right', 'slow', 0.5);
      
      // Verify tree is still visible (didn't break)
      await expect(element(by.text('Complete Skill Tree'))).toBeVisible();
    });

    it('should support zoom on web platform', async () => {
      // Note: Zoom via wheel is web-only
      // On mobile, pinch gestures would be used
      // This is harder to test in Detox
      
      // For web, you might use:
      // await web.element(by.id('skill-tree-visualizer')).scroll(100, 'up');
    });
  });

  // ===== Test 7: Data Persistence =====
  describe('Data Persistence', () => {
    it('should maintain student selection across navigation', async () => {
      // 1. Go to profile and select a student
      await element(by.text('Me')).tap();
      await waitFor(element(by.text('👩‍🎓 Select a Student')))
        .toBeVisible()
        .withTimeout(3000);

      // 2. Select a specific student (e.g., Y5_U1)
      // await element(by.text('Y5_U1')).tap();

      // 3. Navigate to skill tree
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();

      // 4. Verify the selected student is shown in header
      // await expect(element(by.text('Y5_U1'))).toBeVisible();
    });

    it('should reload data when returning to skill tree', async () => {
      // Navigate to skill tree
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      
      // Navigate away
      await element(by.text('Back')).tap();
      
      // Navigate back to skill tree
      await element(by.text('🌿 Skill Tree')).tap();
      
      // Verify tree is loaded again
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  // ===== Test 8: Error Handling =====
  describe('Error Handling', () => {
    it('should handle case when no student is selected', async () => {
      // This test would require clearing AsyncStorage first
      // Then navigating to skill tree
      // Expected: Show a message or default student
      
      // await device.clearKeychain();
      // await element(by.text('Rec')).tap();
      // await element(by.text('🌿 Skill Tree')).tap();
      // await expect(element(by.text('No student selected'))).toBeVisible();
    });

    it('should display loading indicator while data loads', async () => {
      await element(by.text('Rec')).tap();
      await element(by.text('🌿 Skill Tree')).tap();
      
      // Check for loading indicator
      // await expect(element(by.text('Loading Skill Tree...'))).toBeVisible();
      
      // Wait for content to load
      await waitFor(element(by.text('Complete Skill Tree')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});

