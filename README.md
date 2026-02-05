
# STAR-Pulse: Satellite Telemetry Analysis & Reporting Platform

**Student Name:** Karanjeet Singh
**Student ID:** W2041157
**Module:** 6COSC023W – Computer Science Final Project

---

## 🚀 Project Overview

STAR-Pulse is a web-based prototype designed to visualize satellite telemetry and detect operational anomalies using Machine Learning.

**Key Features:**

* **Real-time Visualization:** React-based dashboard with live satellite tracking maps.
* **Anomaly Detection:** Uses the **Isolation Forest** algorithm (Unsupervised Learning) to identify outliers in telemetry data.
* **Architecture:** Decoupled architecture using a Django REST Framework (API) backend and a React (Vite) frontend.

---

## 🛠️ Prerequisites (Run These First)

To run this project, your computer must have **Python** and **Node.js** installed.

### **1. Check for Python**

* Open a terminal and type: `python --version`
* **If missing:**
  * **Windows:** Run `winget install Python.Python.3.11` in PowerShell.
  * **Mac:** Run `brew install python` (requires Homebrew).
  * **Manual:** Download from [python.org](https://www.python.org/downloads/) (Ensure you tick **"Add Python to PATH"**).

### **2. Check for Node.js**

* Open a terminal and type: `node -v`
* **If missing:**
  * **Windows:** Run `winget install OpenJS.NodeJS.LTS`
  * **Mac:** Run `brew install node`
  * **Manual:** Download from [nodejs.org](https://nodejs.org/en/download/).

---

## 📂 Installation & Setup Guide

This project requires **two separate terminal windows** running simultaneously: one for the Server (Backend) and one for the Interface (Frontend).

### 🟢 Terminal 1: Backend Setup (Django)

1. **Navigate to the backend folder:**

   ```bash
   cd backend
   ```
2. **Create a Virtual Environment:**

   * *Windows:* `python -m venv venv`
   * *Mac/Linux:* `python3 -m venv venv`
3. **Activate the Environment:**

   * *Windows:* `venv\Scripts\activate`
   * *Mac/Linux:* `source venv/bin/activate`
     *(You should see `(venv)` appear at the start of your command line).*
4. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```
5. **Initialize the Database:**

   ```bash
   python manage.py migrate
   ```
6. **Start the API Server:**

   ```bash
   python manage.py runserver
   ```

   ✅ **Success:** You will see: `Starting development server at http://127.0.0.1:8000/`

---

### 🔵 Terminal 2: Frontend Setup (React)

1. **Navigate to the frontend folder:**

   ```bash
   cd frontend
   ```
2. **Install Dependencies:**

   ```bash
   npm install
   ```

   *(This downloads React, Leaflet Maps, Plotly, and other UI libraries).*
3. **Start the Dashboard:**

   ```bash
   npm run dev
   ```
4. **Open in Browser:**

   * Hold `Ctrl` (or `Cmd`) and click the local link shown (e.g., `http://localhost:5173`).

---

## 🖥️ How to Test the Prototype

Once both terminals are running, follow these steps to demonstrate the system:

1. **View the Map:**
   On the home dashboard, you should see a live map centering on the satellite's current position (simulated or fetched via N2YO API).
2. **Upload Telemetry Data:**

   * Navigate to the **"Upload"** tab in the sidebar.
   * Click "Choose File".
   * Select the sample file: `sample_data/telemetry_sample.csv` (included in the project).
   * Click **"Analyze"**.
3. **View Analysis Results:**

   * The system will process the CSV using the Isolation Forest model.
   * Results will display time-series graphs.
   * **Red Markers** indicate detected anomalies (outliers).

---

## ⚠️ Troubleshooting Common Issues

**1. "pip is not recognized" or "Module not found"**

* Ensure you have activated the virtual environment (`venv`) before installing requirements.
* On Windows, try using `py` instead of `python` if the command fails.

**2. "npm is not recognized"**

* You likely installed Node.js but haven't restarted your computer or terminal. Close the terminal and try again.

**3. "Network Error" on the Dashboard**

* This means the Frontend cannot talk to the Backend.
* Check **Terminal 1**: Is the Django server running?
* Check the port: The frontend expects the backend at `http://127.0.0.1:8000`.

**4. Map not loading**

* Ensure you have an internet connection (Map tiles are fetched from OpenStreetMap/CartoCDN).

---

## 📜 Technology Stack

* **Frontend:** React.js, Vite, Axios, Recharts, Leaflet
* **Backend:** Django REST Framework (DRF), Python 3.x
* **Machine Learning:** Scikit-learn (Isolation Forest), Pandas, NumPy
* **Database:** SQLite (Prototype default)
