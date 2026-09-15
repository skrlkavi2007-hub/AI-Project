import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import LostItemsPage from './pages/LostItemsPage';
import FoundItemsPage from './pages/FoundItemsPage';
import ReportLostPage from './pages/ReportLostPage';
import ReportFoundPage from './pages/ReportFoundPage';
import AIMatchCenterPage from './pages/AIMatchCenterPage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import HowItWorksPage from './pages/HowItWorksPage';

import AIProcessingModal from './components/AIProcessingModal';
import VerificationModal from './components/VerificationModal';
import CompareModal from './components/CompareModal';
import NotificationDrawer from './components/NotificationDrawer';
import { findBestMatches } from './utils/aiMatcher';

function MainApp() {
  const { lostItems, foundItems } = useApp();

  // Active page router state
  const [activePage, setActivePage] = useState('home');

  // Selected item for details page
  const [selectedItem, setSelectedItem] = useState(null);

  // Modals state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // AI Scanner modal
  const [aiScanModal, setAiScanModal] = useState({
    isOpen: false,
    targetItem: null,
    matches: [],
  });

  // Verification modal
  const [verifyModal, setVerifyModal] = useState({
    isOpen: false,
    foundItem: null,
    lostItemId: null,
  });

  // Compare modal
  const [compareModal, setCompareModal] = useState({
    isOpen: false,
    lostItem: null,
    foundItem: null,
    matchData: null,
  });

  // Navigation handlers
  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setActivePage('item-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenVerify = (foundItem, lostItemId = null) => {
    setVerifyModal({
      isOpen: true,
      foundItem,
      lostItemId,
    });
  };

  const handleSelectCompareMatch = (lostItem, foundItem, matchData) => {
    setCompareModal({
      isOpen: true,
      lostItem,
      foundItem,
      matchData,
    });
  };

  const handleTriggerScanModal = (targetItem, matches) => {
    setAiScanModal({
      isOpen: true,
      targetItem,
      matches,
    });
  };

  const handleFindMatchesForLost = (lostItem) => {
    const matches = findBestMatches(lostItem, foundItems);
    setAiScanModal({
      isOpen: true,
      targetItem: lostItem,
      matches,
    });
  };

  const handleNavigateFromNotification = (itemId) => {
    const all = [...lostItems, ...foundItems];
    const found = all.find(i => i.id === itemId);
    if (found) {
      handleViewDetails(found);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Sticky Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        openNotifications={() => setIsNotificationOpen(true)}
      />

      {/* Main Page Routing */}
      <main className="flex-1">
        {activePage === 'home' && (
          <LandingPage
            setActivePage={setActivePage}
            onOpenSearchWithQuery={(q) => {
              setActivePage('ai-match');
            }}
          />
        )}

        {activePage === 'lost-items' && (
          <LostItemsPage
            onViewDetails={handleViewDetails}
            onOpenReportLost={() => setActivePage('report-lost')}
            onFindMatches={handleFindMatchesForLost}
          />
        )}

        {activePage === 'found-items' && (
          <FoundItemsPage
            onViewDetails={handleViewDetails}
            onOpenReportFound={() => setActivePage('report-found')}
            onVerifyItem={(item) => handleOpenVerify(item)}
          />
        )}

        {activePage === 'report-lost' && (
          <ReportLostPage
            setActivePage={setActivePage}
            onTriggerScanModal={handleTriggerScanModal}
          />
        )}

        {activePage === 'report-found' && (
          <ReportFoundPage
            setActivePage={setActivePage}
            onTriggerScanModal={handleTriggerScanModal}
          />
        )}

        {activePage === 'ai-match' && (
          <AIMatchCenterPage
            onSelectCompareMatch={handleSelectCompareMatch}
            onOpenVerification={(item) => handleOpenVerify(item)}
          />
        )}

        {activePage === 'item-details' && (
          <ItemDetailsPage
            item={selectedItem}
            onBack={() => setActivePage(selectedItem?.type === 'lost' ? 'lost-items' : 'found-items')}
            onOpenVerify={(item) => handleOpenVerify(item, selectedItem?.type === 'lost' ? selectedItem.id : null)}
            onSelectCompareMatch={handleSelectCompareMatch}
            onFindMatches={handleFindMatchesForLost}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardPage
            setActivePage={setActivePage}
            onViewDetails={handleViewDetails}
            onSelectCompareMatch={handleSelectCompareMatch}
            onOpenReportLost={() => setActivePage('report-lost')}
            onOpenReportFound={() => setActivePage('report-found')}
          />
        )}

        {activePage === 'admin' && (
          <AdminPage
            onViewDetails={handleViewDetails}
            onSelectCompareMatch={handleSelectCompareMatch}
          />
        )}

        {activePage === 'how-it-works' && (
          <HowItWorksPage setActivePage={setActivePage} />
        )}
      </main>

      {/* Global Modals */}

      {/* 1. AI Processing & Matching Scan Modal */}
      <AIProcessingModal
        isOpen={aiScanModal.isOpen}
        onClose={() => setAiScanModal(prev => ({ ...prev, isOpen: false }))}
        targetItem={aiScanModal.targetItem}
        matches={aiScanModal.matches}
        onSelectMatch={(foundCandidate, matchData) => {
          handleSelectCompareMatch(aiScanModal.targetItem, foundCandidate, matchData);
        }}
      />

      {/* 2. Safe Ownership Verification Modal */}
      <VerificationModal
        isOpen={verifyModal.isOpen}
        onClose={() => setVerifyModal(prev => ({ ...prev, isOpen: false }))}
        foundItem={verifyModal.foundItem}
        lostItemId={verifyModal.lostItemId}
      />

      {/* 3. Side-by-Side Comparison Modal */}
      <CompareModal
        isOpen={compareModal.isOpen}
        onClose={() => setCompareModal(prev => ({ ...prev, isOpen: false }))}
        lostItem={compareModal.lostItem}
        foundItem={compareModal.foundItem}
        matchData={compareModal.matchData}
        onRequestVerify={(item, lostId) => {
          handleOpenVerify(item, lostId);
        }}
      />

      {/* 4. Slide-Over Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigateItem={handleNavigateFromNotification}
      />

      {/* Bottom Footer */}
      <Footer setActivePage={setActivePage} />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
