import { addDays, format } from "date-fns";

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

export {
    createSlots,
    createSchedule
}