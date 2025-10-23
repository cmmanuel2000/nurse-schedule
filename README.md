# 🏥 Nurse Schedule Maker

A modern, intelligent scheduling application for healthcare facilities with an automated shift assignment system.

![Modern UI](https://img.shields.io/badge/UI-Vercel%20Style-black)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)

## ✨ Features

### 🤖 Smart Scheduling Algorithm
- **Automatic shift assignment** with intelligent conflict resolution
- **40-hour work week enforcement** (2x 8-hour + 2x 12-hour shifts)
- **Flexible staffing targets** (7-8 nurses, 2-3 nursing attendants)
- **AM shift priority** for optimal coverage
- **4-day consecutive work limit** with automatic rest enforcement
- **Mandatory day off after night shifts** (6P6A, 10P6A)

### 📅 Shift Management
- **5 shift types**: 6A6P, 6A2P, 2P10P, 6P6A, 10P6A
- **Custom shift requests** per staff member
- **Unavailability tracking** with date range support
- **Weekly hour balancing** across all staff

### 🎨 Modern UI
- **Vercel-inspired dark theme** with smooth animations
- **Fully responsive** design (mobile, tablet, desktop)
- **Sticky table headers** for easy navigation
- **Color-coded unavailability** (red X marks)
- **Real-time schedule visualization**
- **Excel export** functionality

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/nurse-schedule.git
cd nurse-schedule
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

4. **Start the server**
```bash
npm start
```

5. **Open your browser**
Navigate to `http://localhost:3000`

## 📋 Usage

### 1. Add Staff Members
- Enter staff name and select role (Nurse/Nursing Attendant/Supervisor)
- Default target: 40 hours per week

### 2. Submit Requests
- **Day Off Requests**: Select staff and date range
- **Shift Requests**: Request specific shifts for specific dates

### 3. Generate Schedule
- Select start and end dates (Monday-Sunday recommended)
- Click "Generate Schedule"
- System automatically assigns shifts following all rules

### 4. View & Export
- Show existing schedules by date range
- Export to Excel for printing/sharing
- Delete schedules as needed

## 🏗️ Project Structure

```
nurse-schedule/
├── logic/
│   ├── scheduler.js          # Core scheduling algorithm
│   └── geminiClient.js        # AI integration (optional)
├── models/
│   ├── staff.js               # Staff member schema
│   ├── schedule.js            # Schedule schema
│   ├── unavailability.js      # Time-off schema
│   └── shiftRequest.js        # Shift request schema
├── routes/
│   └── api.js                 # REST API endpoints
├── public/
│   ├── index.html             # Frontend HTML
│   ├── script.js              # Frontend JavaScript
│   └── styles.css             # Vercel-style CSS
├── server.js                  # Express server
├── package.json
└── .env                       # Environment variables
```

## 🔧 API Endpoints

### Staff
- `POST /api/staff` - Add new staff member
- `GET /api/staff` - Get all staff

### Unavailability
- `POST /api/unavailability` - Submit day off request
- `GET /api/unavailability` - Get all unavailability

### Shift Requests
- `POST /api/shift-requests` - Submit shift request

### Schedule
- `POST /api/generate-schedule` - Generate new schedule
- `GET /api/schedule` - Get all schedules
- `DELETE /api/schedule` - Delete schedule by date range

## 🎯 Scheduling Rules

1. **Weekly Hours**: 40 hours per person (unless time-off requested)
2. **Shift Mix**: 2x 8-hour shifts + 2x 12-hour shifts
3. **Staffing Levels**: 7-8 nurses, 2-3 nursing attendants daily
4. **Consecutive Days**: Maximum 4 days in a row
5. **Night Shift Rest**: Mandatory day off after night shifts
6. **Priority**: AM shifts prioritized for 8th nurse

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Export**: SheetJS (xlsx)
- **UI Design**: Vercel-inspired dark theme

## 📱 Responsive Design

- **Mobile**: < 480px - Optimized touch targets
- **Tablet**: 481px - 1024px - Adaptive layouts
- **Desktop**: 1025px+ - Full-featured interface
- **Large Desktop**: 1400px+ - Spacious layout

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ for healthcare workers

## 🙏 Acknowledgments

- Design inspired by Vercel's modern UI
- Built to simplify healthcare scheduling
