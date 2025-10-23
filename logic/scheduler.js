const Staff = require('../models/staff');
const Unavailability = require('../models/unavailability');
const Schedule = require('../models/schedule');
const ShiftRequest = require('../models/shiftRequest');

// Define shift details
const SHIFTS = [
    { code: '6A6P', hours: 12 },
    { code: '6A2P', hours: 8 },
    { code: '2P10P', hours: 8 },
    { code: '6P6A', hours: 12 },
    { code: '10P6A', hours: 8 }
];

// --- Define flexible daily targets with a MINIMUM and MAXIMUM ---
const DAILY_STAFFING_TARGETS = {
    'Nurse': { min: 7, max: 8 },
    'Nursing Attendant': { min: 2, max: 3 }
};

// --- Define which shifts are preferred for the "ideal" (8th) nurse ---
const AM_SHIFTS_PREFERENCE = ['6A6P', '6A2P', '2P10P'];
const SHIFT_PRIORITY = ['6A6P', '6P6A', '6A2P', '2P10P', '10P6A'];

// --- Define rules for rest days ---
const MAX_CONSECUTIVE_DAYS = 4;
const NIGHT_SHIFTS = ['6P6A', '10P6A'];


// Helper function to prevent timezone issues
const parseDateStringAsLocal = (dateStr) => new Date(`${dateStr}T00:00:00`);
const getLocalDateKey = (date) => {
    if (!(date instanceof Date)) { date = new Date(date); }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getWeekKey = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return getLocalDateKey(monday);
};

const createUnavailabilityMap = (unavailability) => {
    const map = {};
    unavailability.forEach(req => {
        const dateKey = getLocalDateKey(req.date);
        const staffId = req.staffId.toString();
        if (!map[staffId]) map[staffId] = [];
        map[staffId].push(dateKey);
    });
    return map;
};

const createShiftRequestMap = (requests) => {
    const map = {};
    requests.forEach(req => {
        const dateKey = getLocalDateKey(req.date);
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push({ staffId: req.staffId.toString(), shift: req.shift });
    });
    return map;
};


// --- FINAL, DEFINITIVE SCHEDULING ALGORITHM ---
async function generateSchedule(startDateStr, endDateStr) {
    const startDate = parseDateStringAsLocal(startDateStr);
    const endDate = parseDateStringAsLocal(endDateStr);

    await Schedule.deleteMany({ date: { $gte: startDate, $lte: endDate } });

    const staff = await Staff.find({ role: { $ne: 'Supervisor' } }).lean();
    const unavailability = await Unavailability.find().lean();
    const shiftRequests = await ShiftRequest.find().lean();
    
    // --- CRITICAL FIX: Fetch ALL existing schedules before the start date ---
    // This includes the previous day AND the entire week before to properly check hours/mix
    const weekBeforeStart = new Date(startDate);
    weekBeforeStart.setDate(startDate.getDate() - 7);
    const existingSchedules = await Schedule.find({ date: { $lt: startDate, $gte: weekBeforeStart } }).lean();

    const unavailabilityMap = createUnavailabilityMap(unavailability);
    const shiftRequestMap = createShiftRequestMap(shiftRequests);
    
    const staffHoursByWeek = {}, consecutiveDaysWorked = {}, staffShiftMixByWeek = {};
    staff.forEach(s => {
        const staffId = s._id.toString();
        staffHoursByWeek[staffId] = {}; 
        consecutiveDaysWorked[staffId] = 0;
        staffShiftMixByWeek[staffId] = {};
    });

    // Pre-populate weekly hours and shift mix from existing schedules
    existingSchedules.forEach(sched => {
        const staffIdStr = sched.staffId.toString();
        const schedWeekKey = getWeekKey(sched.date);
        const shiftInfo = SHIFTS.find(s => s.code === sched.shift);
        
        if (shiftInfo) {
            if (!staffHoursByWeek[staffIdStr][schedWeekKey]) staffHoursByWeek[staffIdStr][schedWeekKey] = 0;
            staffHoursByWeek[staffIdStr][schedWeekKey] += shiftInfo.hours;
            
            if (!staffShiftMixByWeek[staffIdStr][schedWeekKey]) {
                staffShiftMixByWeek[staffIdStr][schedWeekKey] = { eightHour: 0, twelveHour: 0 };
            }
            if (shiftInfo.hours === 8) staffShiftMixByWeek[staffIdStr][schedWeekKey].eightHour++;
            if (shiftInfo.hours === 12) staffShiftMixByWeek[staffIdStr][schedWeekKey].twelveHour++;
        }
    });

    const newSchedule = [...existingSchedules]; // Include ALL existing schedules for continuity checks
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateKey = getLocalDateKey(currentDate);
        const weekKey = getWeekKey(currentDate);

        staff.forEach(s => {
            if (!staffShiftMixByWeek[s._id.toString()][weekKey]) {
                staffShiftMixByWeek[s._id.toString()][weekKey] = { eightHour: 0, twelveHour: 0 };
            }
        });

        const context = { staff, dateKey, weekKey, newSchedule, unavailabilityMap, staffHoursByWeek, consecutiveDaysWorked, currentDate, staffShiftMixByWeek, startDate };
        
        // Pre-Assignment Pass for Shift Requests
        const dailyRequests = shiftRequestMap[dateKey] || [];
        for (const request of dailyRequests) {
            const person = staff.find(p => p._id.toString() === request.staffId);
            if (!person) continue;

            const isAvailable = findBestStaffForDay({ ...context, role: person.role, specificPersonId: person._id.toString() });
            const shiftInfo = SHIFTS.find(s => s.code === request.shift);
            
            if (isAvailable && shiftInfo) {
                const canTakeShift = canPersonTakeShift(person, shiftInfo, weekKey, staffHoursByWeek, staffShiftMixByWeek, unavailabilityMap, context);
                if(canTakeShift) {
                    assignShift(person, shiftInfo, newSchedule, currentDate, staffHoursByWeek, staffShiftMixByWeek, weekKey);
                }
            }
        }
        
        // PASS 1 & 2: Fill remaining slots
        for (const role of ['Nurse', 'Nursing Attendant']) { fillDay(role, 'min', context); }
        fillDay('Nurse', 'max', { ...context, preferredShifts: AM_SHIFTS_PREFERENCE });
        fillDay('Nursing Attendant', 'max', context);
        
        // Update consecutive day counters
        const dailyAssignments = new Set(newSchedule.filter(s => getLocalDateKey(s.date) === dateKey).map(s => s.staffId.toString()));
        for (const person of staff) {
            const staffIdStr = person._id.toString();
            if (dailyAssignments.has(staffIdStr)) {
                consecutiveDaysWorked[staffIdStr]++;
            } else {
                consecutiveDaysWorked[staffIdStr] = 0;
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filter out the existing schedules before saving - only save newly generated schedules
    const finalScheduleToSave = newSchedule.filter(s => s.date >= startDate && s.date <= endDate);
    if (finalScheduleToSave.length > 0) { await Schedule.insertMany(finalScheduleToSave); }
    
    return { message: 'Schedule generated with all rules integrated.', assignedShifts: finalScheduleToSave.length, staffHours: staffHoursByWeek };
}

// --- HELPER FUNCTIONS ---

function fillDay(role, targetType, context) {
    const { staff, dateKey, newSchedule } = context;
    const targetCount = DAILY_STAFFING_TARGETS[role][targetType];

    while (true) {
        const currentDailyCount = newSchedule.filter(s => getLocalDateKey(s.date) === dateKey && staff.find(p => p._id.toString() === s.staffId.toString())?.role === role).length;
        if (currentDailyCount >= targetCount) break;

        const person = findBestStaffForDay({ ...context, role });
        if (!person) break; 

        const shift = findBestShiftForPerson({ ...context, person });
        if (shift) {
            assignShift(person, shift, newSchedule, context.currentDate, context.staffHoursByWeek, context.staffShiftMixByWeek, context.weekKey);
        } else {
            newSchedule.push({ staffId: person._id, date: new Date(context.currentDate), shift: "UNASSIGNABLE" });
        }
    }
    for(let i = newSchedule.length - 1; i >= 0; i--) {
        if (newSchedule[i].shift === "UNASSIGNABLE") newSchedule.splice(i, 1);
    }
}

function assignShift(person, shift, schedule, currentDate, hoursTracker, mixTracker, weekKey) {
    schedule.push({ staffId: person._id, date: new Date(currentDate), shift: shift.code });
    const staffIdStr = person._id.toString();
    if (!hoursTracker[staffIdStr][weekKey]) hoursTracker[staffIdStr][weekKey] = 0;
    hoursTracker[staffIdStr][weekKey] += shift.hours;
    if (shift.hours === 8) mixTracker[staffIdStr][weekKey].eightHour++;
    if (shift.hours === 12) mixTracker[staffIdStr][weekKey].twelveHour++;
}

function findBestStaffForDay(context) {
    const { staff, role, dateKey, newSchedule, unavailabilityMap, consecutiveDaysWorked, specificPersonId } = context;

    const availableStaff = staff.filter(person => {
        if (specificPersonId && person._id.toString() !== specificPersonId) return false;
        if (person.role !== role) return false;
        const staffIdStr = person._id.toString();
        
        if (unavailabilityMap[staffIdStr]?.includes(dateKey)) return false;
        if (consecutiveDaysWorked[staffIdStr] >= MAX_CONSECUTIVE_DAYS) return false;
        if (newSchedule.some(s => getLocalDateKey(s.date) === dateKey && s.staffId.toString() === staffIdStr)) return false;
        
        // --- CORE FIX: This now correctly checks the combined schedule for the night shift rule ---
        const yesterday = new Date(dateKey);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getLocalDateKey(yesterday);
        const previousAssignment = newSchedule.find(s => getLocalDateKey(s.date) === yesterdayKey && s.staffId.toString() === staffIdStr);
        if (previousAssignment && NIGHT_SHIFTS.includes(previousAssignment.shift)) return false; 
        
        return true;
    });

    if (!specificPersonId) {
        availableStaff.sort((a, b) => {
            const hoursA = context.staffHoursByWeek[a._id.toString()]?.[context.weekKey] || 0;
            const hoursB = context.staffHoursByWeek[b._id.toString()]?.[context.weekKey] || 0;
            return hoursA - hoursB;
        });
    }
    
    return availableStaff.length > 0 ? availableStaff[0] : null;
}

function canPersonTakeShift(person, shiftInfo, weekKey, staffHoursByWeek, staffShiftMixByWeek, unavailabilityMap, context) {
    const staffIdStr = person._id.toString();
    const hasRequestedTimeOff = hasTimeOffThisWeek(staffIdStr, weekKey, unavailabilityMap);
    const currentMix = staffShiftMixByWeek[staffIdStr]?.[weekKey] || { eightHour: 0, twelveHour: 0 };
    const currentWeeklyHours = staffHoursByWeek[staffIdStr]?.[weekKey] || 0;

    // NEW: If this is a night shift, check if the person is scheduled to work tomorrow
    if (context && NIGHT_SHIFTS.includes(shiftInfo.code)) {
        const tomorrow = new Date(context.currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = getLocalDateKey(tomorrow);
        
        // Check if person is already scheduled for tomorrow
        const hasTomorrowShift = context.newSchedule.some(s => 
            getLocalDateKey(s.date) === tomorrowKey && s.staffId.toString() === staffIdStr
        );
        
        if (hasTomorrowShift) return false; // Can't work night shift if working tomorrow
    }

    // If person has requested time off this week, they can work flexible hours
    if (hasRequestedTimeOff) {
        // Allow them to work more flexibly, but still respect total hours limit
        if (currentWeeklyHours + shiftInfo.hours > person.targetHours) return false;
        return true;
    }

    // If NO time off requested, enforce strict 40-hour week with 2x8 + 2x12 mix
    const targetHours = person.targetHours || 40;
    
    // Don't exceed target hours
    if (currentWeeklyHours + shiftInfo.hours > targetHours) return false;
    
    // Enforce the 2x8-hour + 2x12-hour shift mix for 40-hour weeks
    if (targetHours === 40) {
        if (shiftInfo.hours === 12 && currentMix.twelveHour >= 2) return false;
        if (shiftInfo.hours === 8 && currentMix.eightHour >= 2) return false;
    }
    
    return true;
}

function findBestShiftForPerson(context) {
    const { person, weekKey, newSchedule, dateKey, preferredShifts, unavailabilityMap, staffHoursByWeek, staffShiftMixByWeek } = context;
    
    const staffIdStr = person._id.toString();
    const currentMix = staffShiftMixByWeek[staffIdStr]?.[weekKey] || { eightHour: 0, twelveHour: 0 };
    const hasRequestedTimeOff = hasTimeOffThisWeek(staffIdStr, weekKey, unavailabilityMap);
    const targetHours = person.targetHours || 40;
    
    let potentialShifts;
    
    // If no time off and targeting 40 hours, prioritize shifts to reach 2x8 + 2x12 balance
    if (!hasRequestedTimeOff && targetHours === 40) {
        // Prioritize 12-hour shifts if we need more 12-hour shifts
        if (currentMix.twelveHour < 2) {
            potentialShifts = preferredShifts 
                ? preferredShifts.filter(s => SHIFTS.find(sh => sh.code === s)?.hours === 12).concat(
                    preferredShifts.filter(s => SHIFTS.find(sh => sh.code === s)?.hours === 8)
                  )
                : ['6A6P', '6P6A', '6A2P', '2P10P', '10P6A'];
        } 
        // Prioritize 8-hour shifts if we need more 8-hour shifts
        else if (currentMix.eightHour < 2) {
            potentialShifts = preferredShifts 
                ? preferredShifts.filter(s => SHIFTS.find(sh => sh.code === s)?.hours === 8).concat(
                    preferredShifts.filter(s => SHIFTS.find(sh => sh.code === s)?.hours === 12)
                  )
                : ['6A2P', '2P10P', '10P6A', '6A6P', '6P6A'];
        } else {
            potentialShifts = preferredShifts || SHIFT_PRIORITY;
        }
    } else {
        // For staff with time off or non-40-hour targets, use default priority
        potentialShifts = preferredShifts ? preferredShifts : [...SHIFT_PRIORITY].sort((a, b) => {
            const countA = newSchedule.filter(s => getLocalDateKey(s.date) === dateKey && s.shift === a).length;
            const countB = newSchedule.filter(s => getLocalDateKey(s.date) === dateKey && s.shift === b).length;
            return countA - countB;
        });
    }

    for (const shiftCode of potentialShifts) {
        const shiftInfo = SHIFTS.find(s => s.code === shiftCode);
        if (canPersonTakeShift(person, shiftInfo, weekKey, staffHoursByWeek, staffShiftMixByWeek, unavailabilityMap, context)) {
            return shiftInfo;
        }
    }
    return null; 
}

function hasTimeOffThisWeek(personId, weekKey, unavailabilityMap) {
    const monday = parseDateStringAsLocal(weekKey);
    const personUnavailability = unavailabilityMap[personId] || [];
    if (personUnavailability.length === 0) return false;
    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(monday);
        checkDate.setDate(monday.getDate() + i);
        if (personUnavailability.includes(getLocalDateKey(checkDate))) return true;
    }
    return false;
}

module.exports = { generateSchedule };