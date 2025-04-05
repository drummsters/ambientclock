import { StateManager } from '../../core/state-manager.js';
import * as logger from '../../utils/logger.js'; // Import the logger

/**
 * DragPlugin for BaseUIElement
 * Adds drag-and-drop functionality to an element.
 */
export const DragPlugin = {
  name: 'draggable', // Name used to identify the plugin

  /**
   * Initializes the plugin for a given element instance.
   * @param {BaseUIElement} element - The element instance this plugin is attached to.
   * @param {object} [config={}] - Plugin-specific configuration (optional).
   * @returns {object} An object containing methods/properties the plugin exposes (e.g., destroy).
   */
  init(element, config = {}) {
    console.log(`Initializing DragPlugin for element: ${element.id}`);

    // --- Plugin State ---
    let isDragging = false;
    let isPinching = false;
    let startX, startY; // Mouse/Touch position at drag start
    let elementStartX, elementStartY; // Element position (%) at drag start
    let startDistance = 0; // Initial distance between fingers for pinch
    let startScale = 1; // Initial scale when pinch starts

    // --- Event Handlers ---
    const handleStart = (event) => {
      // Handle both mouse and touch events
      const isTouch = event.type === 'touchstart';
      if (!isTouch && event.button !== 0) return; // For mouse, only use left button
      
      // Check for pinch gesture (two finger touch)
      if (isTouch && event.touches.length === 2) {
        isPinching = true;
        isDragging = false; // Stop dragging if it was in progress
        
        // Calculate initial distance between fingers
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        startDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        // Get current scale from state
        const currentState = StateManager.getNestedValue(StateManager.getState(), element.statePath);
        startScale = currentState?.scale ?? 1;
        
        return; // Exit early, we'll handle pinch in handleMove
      }
      
      // Single touch/mouse handling
      const clientX = isTouch ? event.touches[0].clientX : event.clientX;
      const clientY = isTouch ? event.touches[0].clientY : event.clientY;
      
      // Check if the click target is the container or one of its direct children
      // This prevents dragging if clicking deep inside complex elements, but allows dragging the main element
      // A more robust solution might involve specific draggable handles later.
      if (event.target !== element.container && event.target.parentNode !== element.container) {
         // Allow dragging if clicking on simple child elements like clock hands/face
         // Refine this check if needed for more complex elements
         if (!event.target.classList.contains('hand') && !event.target.classList.contains('analog-face') && !event.target.classList.contains('date-face')) {
            // console.log("Drag prevented: Click target is not container or allowed child.", event.target);
            // return; 
            // Let's allow dragging from anywhere within the container for now
         }
      }
      
      event.preventDefault(); // Prevent text selection during drag
      isDragging = true;
      
      // Record starting positions
      startX = clientX;
      startY = clientY;
      
      // Get current element position from state (or default if not set)
      const currentState = StateManager.getNestedValue(StateManager.getState(), element.statePath);
      elementStartX = currentState?.position?.x ?? 50; // Default to center if no position
      elementStartY = currentState?.position?.y ?? 50;
      
      // Add class for visual feedback (optional)
      element.container.classList.add('is-dragging');
      
      // Add appropriate event listeners based on event type
      if (isTouch) {
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
      } else {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('mouseleave', handleEnd);
      }
    };

    const handleMove = (event) => {
      if (!isDragging && !isPinching) return;

      event.preventDefault(); // Prevent scrolling on mobile
      
      const isTouch = event.type === 'touchmove';
      
      // Handle pinch gesture
      if (isPinching && isTouch && event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        // Calculate new scale
        const scaleFactor = currentDistance / startDistance;
        let newScale = startScale * scaleFactor;
        
        // Limit scale range (adjust these values as needed)
        newScale = Math.max(0.5, Math.min(3.0, newScale));
        
        // Update element scale via state
        if (element.stateBinding && typeof element.stateBinding.updateElementState === 'function') {
          element.stateBinding.updateElementState({ scale: newScale });
        }
        
        return; // Exit early, don't process as drag
      }
      
      // Handle drag
      if (isDragging) {
        const currentX = isTouch ? event.touches[0].clientX : event.clientX;
        const currentY = isTouch ? event.touches[0].clientY : event.clientY;
      
        // Calculate distance moved in pixels
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Convert pixel delta to percentage delta based on viewport size
        const deltaPercentX = (deltaX / window.innerWidth) * 100;
        const deltaPercentY = (deltaY / window.innerHeight) * 100;
        
        // Calculate new percentage position
        let newX = elementStartX + deltaPercentX;
        let newY = elementStartY + deltaPercentY;
        
        // Basic boundary checking to keep element on screen
        const margin = 2; // 2% margin from edges
        newX = Math.max(margin, Math.min(100 - margin, newX));
        newY = Math.max(margin, Math.min(100 - margin, newY));
        
        // Update element style directly for smooth visual feedback during drag
        element.container.style.left = `${newX}%`;
        element.container.style.top = `${newY}%`;
        
        // Only apply transform for centering, scaling is now handled by CSS custom property
        element.container.style.transform = `translate(-50%, -50%)`;
      }
    };

    const handleEnd = (event) => {
      if (!isDragging && !isPinching) return;
      
      isDragging = false;
      isPinching = false;
      
      // Remove all possible event listeners
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('mouseleave', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      
      // Update the state with final position
      const finalX = parseFloat(element.container.style.left);
      const finalY = parseFloat(element.container.style.top);
      
      // Dispatch state update only if position actually changed
      if (finalX !== elementStartX || finalY !== elementStartY) {
          // Remove dragging class after a small delay to prevent outline flash
          setTimeout(() => {
              element.container.classList.remove('is-dragging');
          }, 50);
          console.log(`Drag ended for ${element.id}. New position: (${finalX.toFixed(1)}%, ${finalY.toFixed(1)}%)`);
          // Call updateElementState via the stateBinding mixin/handler
          if (element.stateBinding && typeof element.stateBinding.updateElementState === 'function') {
              element.stateBinding.updateElementState({ position: { x: finalX, y: finalY } });
          } else {
              logger.error(`[DragPlugin] Cannot update state for ${element.id}: stateBinding or updateElementState method not found.`);
          }
      } else {
          // Remove dragging class after a small delay even if position didn't change
          setTimeout(() => {
              element.container.classList.remove('is-dragging');
          }, 50);
          console.log(`Drag ended for ${element.id} with no position change.`);
      }
    };

    // Store the bound handlers so they can be removed later
    const boundStartHandler = handleStart.bind(this);
    element.eventHandlers.dragStart = boundStartHandler; // Store for removal
    
    // Plugin API / Lifecycle
    return {
      // Called by BaseUIElement after element.container exists
      attachEventListeners: () => {
        if (element.container) {
          console.log(`DragPlugin attaching drag listeners to ${element.id}`);
          element.container.addEventListener('mousedown', boundStartHandler);
          element.container.addEventListener('touchstart', boundStartHandler);
        } else {
            logger.error(`DragPlugin: Cannot attach listener, element container not found for ${element.id}`);
        }
      },
      // Called by BaseUIElement during its destroy phase
      destroy: () => {
        console.log(`Destroying DragPlugin for ${element.id}`);
        if (element.container && boundStartHandler) {
          element.container.removeEventListener('mousedown', boundStartHandler);
          element.container.removeEventListener('touchstart', boundStartHandler);
        }
        // Ensure all window listeners are removed if drag was interrupted
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('mouseleave', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('touchcancel', handleEnd);
      }
    };
  }
};
