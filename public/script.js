const API_URL = 'http://localhost:3000/api';

// --- Helper functions to prevent timezone issues ---
const parseDateStringAsLocal = (dateStr) => {
    return new Date(`${dateStr}T00:00:00`);
};

const getLocalDateKey = (date) => {
    if (!(date instanceof Date)) { date = new Date(date); }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


document.addEventListener('DOMContentLoaded', () => {
    loadStaff();
    document.getElementById('addStaffForm').addEventListener('submit', addStaff);
    document.getElementById('addUnavailabilityForm').addEventListener('submit', addUnavailability);
    // Add event listener for the new shift request form
    document.getElementById('addShiftRequestForm').addEventListener('submit', addShiftRequest);
    document.getElementById('generateScheduleForm').addEventListener('submit', generateSchedule);
    document.getElementById('showScheduleForm').addEventListener('submit', showSchedule);
    document.getElementById('deleteScheduleForm').addEventListener('submit', deleteSchedule);
    document.getElementById('exportExcelButton').addEventListener('click', exportToExcel);
    
    // Hide scroll hint after user scrolls
    const scheduleDisplay = document.querySelector('.schedule-display');
    const scrollHint = document.getElementById('scrollHint');
    if (scheduleDisplay && scrollHint) {
        scheduleDisplay.addEventListener('scroll', () => {
            if (scrollHint.style.display !== 'none') {
                scrollHint.style.display = 'none';
            }
        });
    }
});

// --- HELPER FUNCTIONS ---

const formatDate = (dateString) => {
    const date = parseDateStringAsLocal(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- API FUNCTIONS ---

async function loadStaff() {
    try {
        const response = await fetch(`${API_URL}/staff`);
        const staffList = await response.json();
        
        // Populate all staff dropdowns
        const unavailabilitySelect = document.getElementById('unavailabilityStaffId');
        const shiftRequestSelect = document.getElementById('shiftRequestStaffId');
        
        unavailabilitySelect.innerHTML = '<option value="">Select Staff</option>';
        shiftRequestSelect.innerHTML = '<option value="">Select Staff</option>';

        staffList.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff._id;
            option.textContent = `${staff.name} (${staff.role})`;
            
            unavailabilitySelect.appendChild(option.cloneNode(true));
            shiftRequestSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

async function addStaff(event) {
    event.preventDefault();
    const name = document.getElementById('staffName').value.trim().toUpperCase();
    const role = document.getElementById('staffRole').value;

    try {
        const response = await fetch(`${API_URL}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role })
        });

        if (response.status === 201) {
            alert(`Staff ${name} added successfully! (Target: 40 hours)`);
            document.getElementById('addStaffForm').reset();
            loadStaff(); 
        } else {
            const errorData = await response.json();
            alert(`Error adding staff: ${errorData.details || errorData.error}`);
        }
    } catch (error) {
        alert('A network error occurred.');
    }
}

async function addUnavailability(event) {
    event.preventDefault();
    const staffId = document.getElementById('unavailabilityStaffId').value;
    const startDate = parseDateStringAsLocal(document.getElementById('unavailabilityStartDate').value);
    const endDate = parseDateStringAsLocal(document.getElementById('unavailabilityEndDate').value);

    if (startDate > endDate) {
        alert('Start Date cannot be after End Date.');
        return;
    }

    let currentDate = startDate;
    const requests = [];

    while (currentDate <= endDate) {
        const dateString = getLocalDateKey(currentDate);
        
        requests.push(
            fetch(`${API_URL}/unavailability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, date: dateString })
            })
        );
        currentDate.setDate(currentDate.getDate() + 1);
    }

    try {
        const responses = await Promise.all(requests);
        const allSuccessful = responses.every(res => res.ok);

        if (allSuccessful) {
            alert('Day(s)-off request submitted successfully! (Remember to regenerate the schedule)');
            document.getElementById('addUnavailabilityForm').reset();
        } else {
            alert('One or more day-off requests failed. Please try again.');
        }
    } catch (error) {
        alert('A network error occurred while submitting requests.');
    }
}

// --- NEW: Function to handle shift request submissions ---
async function addShiftRequest(event) {
    event.preventDefault();
    const staffId = document.getElementById('shiftRequestStaffId').value;
    const date = document.getElementById('shiftRequestDate').value;
    const shift = document.getElementById('shiftRequestShift').value;

    if (!staffId || !date || !shift) {
        alert('Please fill out all fields.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/shift-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId, date, shift })
        });

        if (response.ok) {
            alert('Shift request submitted successfully! This will be prioritized in the next schedule generation.');
            document.getElementById('addShiftRequestForm').reset();
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
        }
    } catch (error) {
        alert('A network error occurred.');
    }
}


async function generateSchedule(event) {
    event.preventDefault();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (parseDateStringAsLocal(startDate) > parseDateStringAsLocal(endDate)) {
        alert('Start Date cannot be after End Date.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/generate-schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Schedule generated! ${result.assignedShifts} shifts assigned.`);
            loadSchedule(startDate, endDate); 
        } else {
            const errorData = await response.json();
            alert(`Error generating schedule: ${errorData.details || errorData.error}`);
        }
    } catch (error) {
        alert('A network error occurred while generating the schedule.');
    }
}

async function showSchedule(event) {
    event.preventDefault();
    const startDate = document.getElementById('showStartDate').value;
    const endDate = document.getElementById('showEndDate').value;

    if (!startDate || !endDate) {
        alert('Please select both a start and end date.');
        return;
    }
    if (parseDateStringAsLocal(startDate) > parseDateStringAsLocal(endDate)) {
        alert('Start Date cannot be after End Date.');
        return;
    }
    loadSchedule(startDate, endDate);
}

async function deleteSchedule(event) {
    event.preventDefault();
    const startDate = document.getElementById('deleteStartDate').value;
    const endDate = document.getElementById('deleteEndDate').value;

    if (!startDate || !endDate) {
        alert('Please select both a start and end date to delete.');
        return;
    }
    if (parseDateStringAsLocal(startDate) > parseDateStringAsLocal(endDate)) {
        alert('Start Date cannot be after End Date.');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete all schedule entries from ${startDate} to ${endDate}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/schedule`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Successfully deleted ${result.deletedCount} schedule entries.`);
            const currentlyShownStartDate = document.getElementById('showStartDate').value || document.getElementById('startDate').value;
            const currentlyShownEndDate = document.getElementById('showEndDate').value || document.getElementById('endDate').value;
            if (currentlyShownStartDate && currentlyShownEndDate) {
                loadSchedule(currentlyShownStartDate, currentlyShownEndDate);
            } else {
                document.getElementById('scheduleBody').innerHTML = '';
                document.getElementById('dateRow').innerHTML = '<th>Staff/Date</th>';
            }
        } else {
            const errorData = await response.json();
            alert(`Error deleting schedule: ${errorData.error}`);
        }
    } catch (error) {
        alert('A network error occurred while deleting the schedule.');
    }
}


function exportToExcel() {
    const dateRow = document.getElementById('dateRow');
    if (!dateRow || dateRow.cells.length <= 1) {
        alert("Please generate or show a schedule before exporting.");
        return;
    }

    const headers = Array.from(dateRow.cells).map(th => th.textContent);
    const tableBody = document.getElementById('scheduleBody');
    const data = Array.from(tableBody.rows).map(row => {
        const rowData = {};
        Array.from(row.cells).forEach((cell, index) => {
            const cellText = (index === 0) ? cell.querySelector('strong').textContent : cell.textContent;
            rowData[headers[index]] = cellText;
        });
        return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
    XLSX.writeFile(workbook, "Nurse_Schedule.xlsx");
}


// --- SCHEDULE DISPLAY FUNCTION ---

async function loadSchedule(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return;

    try {
        const scheduleResponse = await fetch(`${API_URL}/schedule`);
        if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
        const scheduleData = await scheduleResponse.json();
        
        const staffResponse = await fetch(`${API_URL}/staff`);
        if (!staffResponse.ok) throw new Error('Failed to fetch staff');
        const staffList = await staffResponse.json();

        // NEW: Fetch unavailability data with error handling
        let unavailabilityData = [];
        try {
            const unavailabilityResponse = await fetch(`${API_URL}/unavailability`);
            if (unavailabilityResponse.ok) {
                unavailabilityData = await unavailabilityResponse.json();
            }
        } catch (unavailErr) {
            console.warn('Could not fetch unavailability data:', unavailErr);
            // Continue without unavailability data
        }

        const dates = [];
        let currentDate = parseDateStringAsLocal(startDateStr);
        const endDate = parseDateStringAsLocal(endDateStr);

        while (currentDate <= endDate) {
            dates.push(getLocalDateKey(currentDate)); 
            currentDate.setDate(currentDate.getDate() + 1); 
        }

        const staffSchedule = staffList.map(staff => {
            const staffId = staff._id.toString();
            const rowData = {
                id: staffId,
                name: staff.name,
                role: staff.role,
                shifts: {},
                unavailable: {} // NEW: Track unavailable dates
            };
            
            scheduleData.filter(s => s.staffId && s.staffId._id.toString() === staffId).forEach(assignment => {
                const dateKey = getLocalDateKey(assignment.date);
                rowData.shifts[dateKey] = assignment.shift;
            });

            // NEW: Mark unavailable dates
            unavailabilityData.filter(u => {
                const unavailStaffId = u.staffId._id ? u.staffId._id.toString() : u.staffId.toString();
                return unavailStaffId === staffId;
            }).forEach(unavail => {
                const dateKey = getLocalDateKey(unavail.date);
                rowData.unavailable[dateKey] = true;
            });

            return rowData;
        });
        
        const roleOrder = {
            'Supervisor': 1,
            'Nurse': 2,
            'Nursing Attendant': 3
        };
        
        staffSchedule.sort((a, b) => {
            const orderA = roleOrder[a.role] || 99;
            const orderB = roleOrder[b.role] || 99;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
        });

        const dateRow = document.getElementById('dateRow');
        const scheduleBody = document.getElementById('scheduleBody');
        
        dateRow.innerHTML = '<th>Staff/Date</th>';
        scheduleBody.innerHTML = '';
        
        dates.forEach(dateStr => {
            const th = document.createElement('th');
            th.textContent = formatDate(dateStr);
            dateRow.appendChild(th);
        });

        staffSchedule.forEach(staff => {
            const tr = document.createElement('tr');
            tr.classList.add('staff-row');
            
            const nameCell = document.createElement('td');
            nameCell.innerHTML = `<strong>${staff.name}</strong><br><small>(${staff.role})</small>`;
            tr.appendChild(nameCell);

            dates.forEach(dateKey => {
                const shiftCell = document.createElement('td');
                
                // NEW: Check if unavailable first, then check for shift
                if (staff.unavailable[dateKey]) {
                    shiftCell.textContent = 'X';
                    shiftCell.classList.add('unavailable-slot'); // NEW: Add class for styling
                } else {
                    const shiftCode = staff.shifts[dateKey] || '';
                    shiftCell.textContent = shiftCode;
                    if (shiftCode === '') {
                        shiftCell.classList.add('empty-slot'); 
                    }
                }
                
                tr.appendChild(shiftCell);
            });
            
            scheduleBody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}