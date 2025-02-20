const { addDays, format } = require("date-fns");


const createSlots = (times) => {
    return times.map((time) => ({
      time,
      status: "available",
    }));
  };

const createSchedule=(totalDays,times)=>{
    const today=new Date()
    const schedule=Array(totalDays).fill(null).reduce((acc,cur,i)=>{
        const date=addDays(today,i);
        acc.push({
            date:format(date,"dd-MM-yyyy"),
            status:"available",
            slots: createSlots(times)
        })
        return acc;
    },[])
    return schedule
}

const isEmailOrPhone=(credential)=>{
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{11}$/; // Assuming Bangladeshi phone number format (11 digits)
  
    if (emailRegex.test(credential)) {
      return 'email';
    } else if (phoneRegex.test(credential)) {
      return 'phone';
    } else {
      return 'invalid';
    }
}

module.exports= {
    createSlots,
    createSchedule,
    isEmailOrPhone
}