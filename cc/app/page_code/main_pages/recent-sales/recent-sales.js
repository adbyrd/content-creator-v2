/**
 * RECENT SALES
 * Recent Sales Notification Popup – Looping through CMS collection
 * v.1.0.0
 */

import wixData from 'wix-data';

// Global variables to manage the cycling
let salesItems = [];          // Array of records from the collection
let currentIndex = 0;         // Pointer to the current record
let hideTimeout;              // Timeout for hiding the popup
let showTimeout;              // Timeout for showing the next popup

// Helper to get a random delay between 1 and 59 seconds (in milliseconds)
function getRandomDelay() {
  return Math.floor(Math.random() * (15000 - 1000 + 1)) + 1000; // 1000 to 15000 ms
}

// Function to show the popup with data from the current index
function showPopupWithCurrentSale() {
  if (salesItems.length === 0) return;

  const sale = salesItems[currentIndex];
  
  // Update the two text elements
  $w('#ccMessage').text = `${sale.name} from ${sale.state} just subscribed to the Content Creator.`;
  $w('#ccDuration').text = `${sale.duration} ago.`;

  // Slide the popup up
  $w('#ccPopupRecentSale').show('slide-in');

  // Clear any existing hide timeout
  if (hideTimeout) clearTimeout(hideTimeout);

  // Set timeout to hide after 5 seconds
  hideTimeout = setTimeout(() => {
    $w('#ccPopupRecentSale').hide('slide-out');
    
    // Move to the next record (loop back to start if at the end)
    currentIndex = (currentIndex + 1) % salesItems.length;

    // Schedule the next appearance after a random delay
    if (showTimeout) clearTimeout(showTimeout);
    showTimeout = setTimeout(() => {
      showPopupWithCurrentSale();
    }, getRandomDelay());
  }, 5000); // 5 seconds visible
}

$w.onReady(async function () {
  try {
    // Fetch all records from the "RecentSales" collection
    const results = await wixData.query('RecentSalesv1').find();
    salesItems = results.items;

    if (salesItems.length === 0) {
      console.warn('No sales records found. Popup will not appear.');
      return;
    }

    // Ensure the popup is hidden initially
    $w('#ccPopupRecentSale').hide();

    // Set the initial 5-second delay before first appearance
    setTimeout(() => {
      showPopupWithCurrentSale();
    }, 5000);

    // Handle manual close button
    $w('#ccPopupButton').onClick(() => {
      // Clear the hide timeout to avoid trying to hide an already hidden popup
      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Hide the popup immediately
      $w('#ccPopupRecentSale').hide('slide-out');
      
      // The next show is already scheduled in showPopupWithCurrentSale's timeout,
      // so we don't need to reschedule – it will happen at the random delay.
      // However, if the popup was closed manually before the 10 seconds were up,
      // the hideTimeout was cleared, but the showTimeout is still pending.
      // That's fine; the next popup will appear as scheduled.
    });

  } catch (error) {
    console.error('Error fetching recent sales:', error);
  }
});