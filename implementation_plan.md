# AzeWallet Implementation Plan

This plan addresses the 8 issues reported regarding bugs, UI/UX, and missing features.

## Proposed Changes

### 1. Delete Transaction Feature
- **Modify** src/features/transactions/TransactionComposer.tsx: Add a "Delete" button when editTransaction is present.
- **Modify** src/lib/firebase/firestore.ts: 
  - Update softDeleteTransaction and updateTransaction to fetch the previous transaction data and reverse its impact on the ccountBalance before applying the soft delete or update.

### 2. Account Cards Overlap
- **Modify** src/app/globals.css: Remove the negative margin-top: -80px from .acc-card:not(:first-child) which was causing cards to stack unreadably. Add a standard gap 16px to the list container.

### 3 & 4. Budget Settings (Daily, Weekly, Monthly)
- **Modify** src/types/index.ts: Add dailyBudget, weeklyBudget, and monthlyBudget to UserProfile.
- **Modify** src/app/settings/page.tsx: Add a new "Budget Targets" section with inputs for setting these three values, and save them to the user profile in Firestore.
- **Modify** src/lib/firebase/firestore.ts: Update ecalculateDashboardSummary so that "Safe to Spend Today" respects the custom dailyBudget if set, rather than solely calculating it dynamically.

### 5. AI Chatbot UI & Connection Fixes
- **Modify** src/app/ai/page.tsx:
  - Enhance the chat layout by making message bubbles visually distinct (user vs AI) and improving background colors.
  - Fix the AI connection issues. Often, missing API keys or unhandled timeout errors cause the AI to seem disconnected. I will add proper error boundary and fallback UI for the connection, and ensure it correctly references the API key.
- **Modify** src/lib/gemini.ts: Ensure robust error handling for API calls.

### 6. App Logo Size
- **Modify** src/app/login/page.tsx, src/app/signup/page.tsx, and src/components/layout/AppShell.tsx: Increase the logo image dimensions from 48px/64px to 96px/120px for better visibility.

### 7. Custom Account Save Bug (App Hanging)
- **Modify** src/app/accounts/page.tsx: The app hangs when saving a custom account (or Cash) because it passes an undefined logoUrl to Firestore, which Firestore rejects, causing an unhandled error loop. I will fix this by providing 
ull or a default fallback if suggestion?.logoUrl is undefined.

### 8. FAB Button Overlaps
- **Modify** src/components/layout/BottomTabBar.tsx: Hide the central Plus (Add Transaction) button on pages where it conflicts with the UI, specifically in the AI Chat room (/ai) and Settings (/settings).

## Verification Plan
1. Test editing and deleting a transaction and verify account balance adjusts accordingly.
2. Check the Accounts page to ensure cards render clearly without overlapping.
3. Test setting custom budget limits in Settings and verify it reflects on the Dashboard.
4. Test chatting with the AI to verify the connection, layout, and absence of the FAB button.
5. Add a custom account (e.g. "My Custom Bank") and verify it saves without hanging.
