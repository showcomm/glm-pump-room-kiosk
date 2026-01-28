/**
 * Admin Landing Page
 * 
 * Central hub for all admin functions.
 * TODO: Add authentication/permissions later
 */

import { Link } from 'react-router-dom'

export default function AdminLanding() {
  return (
    <div className="min-h-screen bg-museum-dark text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="text-museum-highlight hover:text-museum-accent text-sm mb-4 inline-block"
          >
            ← Back to Kiosk
          </Link>
          <h1 className="text-3xl font-display text-museum-highlight">
            Kiosk Administration
          </h1>
          <p className="text-gray-400 mt-2">
            Manage content, viewpoints, and settings for the pump room kiosk.
          </p>
        </div>

        {/* Admin Menu */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Display Settings - FOUNDATIONAL */}
          <Link
            to="/admin/display-settings"
            className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-600/50 rounded-lg p-6 transition-colors"
          >
            <h2 className="text-xl font-display text-amber-400 mb-2">
              🖥️ Display Settings
            </h2>
            <p className="text-gray-400 text-sm">
              Set target kiosk resolution and overview camera position. Configure these first.
            </p>
            <span className="text-xs text-amber-600 mt-2 block">Start here</span>
          </Link>

          {/* Hotspot Editor */}
          <Link
            to="/admin/hotspot-editor"
            className="bg-museum-brown/30 hover:bg-museum-brown/50 border border-museum-accent/30 rounded-lg p-6 transition-colors"
          >
            <h2 className="text-xl font-display text-museum-highlight mb-2">
              🎯 Hotspot Regions
            </h2>
            <p className="text-gray-400 text-sm">
              Draw polygon regions around equipment. Click to place points, double-click to close shapes.
            </p>
          </Link>

          {/* Camera Capture */}
          <Link
            to="/admin/camera-capture"
            className="bg-museum-brown/30 hover:bg-museum-brown/50 border border-museum-accent/30 rounded-lg p-6 transition-colors"
          >
            <h2 className="text-xl font-display text-museum-highlight mb-2">
              📷 Camera Positions
            </h2>
            <p className="text-gray-400 text-sm">
              Capture camera viewpoints for equipment hotspots. Navigate the 3D model and save positions.
            </p>
          </Link>

          {/* Equipment Management - placeholder */}
          <div className="bg-museum-brown/20 border border-museum-accent/20 rounded-lg p-6 opacity-50">
            <h2 className="text-xl font-display text-museum-highlight mb-2">
              ⚙️ Equipment Content
            </h2>
            <p className="text-gray-400 text-sm">
              Edit equipment descriptions, specifications, and translations.
            </p>
            <span className="text-xs text-gray-500 mt-2 block">Coming soon</span>
          </div>

          {/* Media Library - placeholder */}
          <div className="bg-museum-brown/20 border border-museum-accent/20 rounded-lg p-6 opacity-50">
            <h2 className="text-xl font-display text-museum-highlight mb-2">
              🖼️ Media Library
            </h2>
            <p className="text-gray-400 text-sm">
              Upload and manage images, drawings, and historical photos.
            </p>
            <span className="text-xs text-gray-500 mt-2 block">Coming soon</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-museum-accent/20 text-gray-500 text-sm">
          <p>Kingston Dry Dock Pump Room Kiosk</p>
          <p>Marine Museum of the Great Lakes</p>
        </div>
      </div>
    </div>
  )
}
