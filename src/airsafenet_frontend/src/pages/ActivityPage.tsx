import { useCallback, useEffect, useState } from "react";
import { http } from "../api/http";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import GoldenHourPicker from "../components/dashboard/GoldenHourPicker";
import WeeklyRiskMatrix from "../components/dashboard/WeeklyRiskMatrix";
import ExposureScoreWidget from "../components/dashboard/ExposureScoreWidget";
import SmartScheduleOptimizer from "../components/dashboard/SmartScheduleOptimizer";
import WeeklyPlannerView from "../components/dashboard/WeeklyPlannerView";

type ActivitySchedule = {
  id: number; name: string; icon: string;
  hourOfDay: number; minute: number; durationMinutes: number;
  isOutdoor: boolean; intensity: "low" | "moderate" | "high"; daysOfWeek: string;
};
type ActivityRisk = ActivitySchedule & {
  forecastPm25: number; forecastAqi: number; forecastRisk: string;
  riskScore: number; riskLevel: string; recommendation: string;
  groupMultiplier: number; intensityMultiplier: number; bestAlternativeHour: number | null;
};
type ForecastResponse = {
  userGroup: string; date: string; activities: ActivityRisk[];
  overallRisk: string; daySummary: string;
};
type FormState = Omit<ActivitySchedule, "id">;

const PRESETS: FormState[] = [
  { name:"Đi làm",         icon:"💼", hourOfDay:7,  minute:0,  durationMinutes:30,  isOutdoor:true,  intensity:"low",      daysOfWeek:"1,2,3,4,5" },
  { name:"Tập thể dục",    icon:"🏃", hourOfDay:6,  minute:0,  durationMinutes:45,  isOutdoor:true,  intensity:"high",     daysOfWeek:"1,2,3,4,5" },
  { name:"Đón con",        icon:"👶", hourOfDay:17, minute:0,  durationMinutes:20,  isOutdoor:true,  intensity:"low",      daysOfWeek:"1,2,3,4,5" },
  { name:"Đi chợ",         icon:"🛒", hourOfDay:8,  minute:0,  durationMinutes:30,  isOutdoor:true,  intensity:"low",      daysOfWeek:"1,2,3,4,5,6,7" },
  { name:"Đi bộ tối",      icon:"🌙", hourOfDay:19, minute:0,  durationMinutes:30,  isOutdoor:true,  intensity:"moderate", daysOfWeek:"1,2,3,4,5,6,7" },
  { name:"Đạp xe",         icon:"🚴", hourOfDay:7,  minute:30, durationMinutes:40,  isOutdoor:true,  intensity:"high",     daysOfWeek:"6,7" },
  { name:"Làm việc VP",    icon:"🖥",  hourOfDay:8,  minute:0,  durationMinutes:480, isOutdoor:false, intensity:"low",      daysOfWeek:"1,2,3,4,5" },
  { name:"Đưa đón trường", icon:"🏫", hourOfDay:7,  minute:0,  durationMinutes:15,  isOutdoor:true,  intensity:"low",      daysOfWeek:"1,2,3,4,5" },
  { name:"Chạy bộ sáng",   icon:"🌅", hourOfDay:5,  minute:30, durationMinutes:45,  isOutdoor:true,  intensity:"high",     daysOfWeek:"1,2,3,4,5,6,7" },
  { name:"Yoga",           icon:"🧘", hourOfDay:6,  minute:30, durationMinutes:60,  isOutdoor:false, intensity:"low",      daysOfWeek:"1,3,5" },
];
const ICONS = ["💼","🏃","👶","🛒","🌙","🚴","🖥","🏫","🧘","🚗","🏊","⚽","🎾","🌿","🏥","✈️","🌅","🎵","🍜","📅"];
const DAYS = [
  {num:1,label:"T2"},{num:2,label:"T3"},{num:3,label:"T4"},
  {num:4,label:"T5"},{num:5,label:"T6"},{num:6,label:"T7"},{num:7,label:"CN"},
];
const EMPTY: FormState = { name:"", icon:"📅", hourOfDay:7, minute:0, durationMinutes:30, isOutdoor:true, intensity:"moderate", daysOfWeek:"1,2,3,4,5" };

const riskColor = (r:string) => r==="GOOD"?"#22c55e":r==="MODERATE"?"#eab308":r==="UNHEALTHY_SENSITIVE"?"#f97316":r==="UNHEALTHY"?"#ef4444":r==="VERY_UNHEALTHY"?"#a855f7":"#7f1d1d";
const riskLabel = (r:string) => r==="GOOD"?"Tốt":r==="MODERATE"?"Trung bình":r==="UNHEALTHY_SENSITIVE"?"Nhạy cảm":r==="UNHEALTHY"?"Không tốt":r==="VERY_UNHEALTHY"?"Rất kém":"Nguy hiểm";
const riskEmoji = (r:string) => r==="GOOD"?"✅":r==="MODERATE"?"🟡":r==="UNHEALTHY_SENSITIVE"?"🟠":"🔴";
const fmtHour   = (h:number,m:number) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
const fmtDur    = (d:number) => d>=60?`${Math.floor(d/60)}h${d%60?`${d%60}p`:""}` :`${d}p`;
const iLabel    = (i:string) => i==="high"?"Mạnh":i==="low"?"Nhẹ":"Vừa";

function timeUntil(h:number, m:number) {
  const now = new Date(), act = new Date();
  act.setHours(h,m,0,0);
  const diff = act.getTime()-now.getTime();
  if (diff<0) return "Đã qua";
  const mins = Math.round(diff/60000);
  if (mins<60) return `${mins}p nữa`;
  return `${Math.floor(mins/60)}h nữa`;
}

function ActivityModal({ initial, onSave, onClose, saving }:{
  initial?:FormState; onSave:(f:FormState)=>void; onClose:()=>void; saving:boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY);
  const [showIcons, setShowIcons] = useState(false);
  const active = form.daysOfWeek.split(",").map(Number).filter(Boolean);
  const toggleDay = (n:number) => {
    const cur = form.daysOfWeek.split(",").map(Number).filter(Boolean);
    const next = cur.includes(n)?cur.filter(d=>d!==n):[...cur,n];
    setForm(f=>({...f,daysOfWeek:next.sort().join(",")||"1"}));
  };

  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e=>e.stopPropagation()}>

        <div className="ap-modal__hd">
          <h3>{initial?"Chỉnh sửa hoạt động":"Thêm hoạt động mới"}</h3>
          <button className="ap-modal__x" onClick={onClose} type="button">✕</button>
        </div>

        {!initial && (
          <div className="ap-modal__presets">
            <div className="ap-presets__label">⚡ Chọn nhanh</div>
            <div className="ap-presets__grid">
              {PRESETS.map((p,i) => (
                <button key={i} className="ap-preset" type="button" onClick={()=>setForm({...p})}>
                  <span>{p.icon}</span><span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ap-modal__bd">
          <div className="ap-row">
            <div className="ap-field" style={{position:"relative",flexShrink:0}}>
              <label>Icon</label>
              <button className="ap-icon-btn" type="button" onClick={()=>setShowIcons(v=>!v)}>
                <span style={{fontSize:24}}>{form.icon}</span>
              </button>
              {showIcons && (
                <div className="ap-icon-picker">
                  {ICONS.map(ic=>(
                    <button key={ic} className={`ap-icon-opt ${form.icon===ic?"active":""}`}
                      type="button" onClick={()=>{setForm(f=>({...f,icon:ic}));setShowIcons(false);}}>
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ap-field" style={{flex:1}}>
              <label>Tên hoạt động</label>
              <input className="ap-input" value={form.name} maxLength={100}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="VD: Đi làm, Tập thể dục..." />
            </div>
          </div>

          <div className="ap-row">
            <div className="ap-field">
              <label>Giờ bắt đầu</label>
              <div style={{display:"flex",gap:6}}>
                <select className="ap-select" value={form.hourOfDay}
                  onChange={e=>setForm(f=>({...f,hourOfDay:Number(e.target.value)}))}>
                  {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}h</option>)}
                </select>
                <select className="ap-select" value={form.minute}
                  onChange={e=>setForm(f=>({...f,minute:Number(e.target.value)}))}>
                  <option value={0}>:00</option><option value={30}>:30</option>
                </select>
              </div>
            </div>
            <div className="ap-field">
              <label>Thời lượng</label>
              <select className="ap-select" value={form.durationMinutes}
                onChange={e=>setForm(f=>({...f,durationMinutes:Number(e.target.value)}))}>
                {[10,15,20,30,45,60,90,120,180,240,480].map(v=><option key={v} value={v}>{fmtDur(v)}</option>)}
              </select>
            </div>
          </div>

          <div className="ap-row">
            <div className="ap-field">
              <label>Địa điểm</label>
              <div className="ap-toggles">
                <button className={`ap-tgl ${form.isOutdoor?"on":""}`} type="button" onClick={()=>setForm(f=>({...f,isOutdoor:true}))}>🌤 Ngoài trời</button>
                <button className={`ap-tgl ${!form.isOutdoor?"on":""}`} type="button" onClick={()=>setForm(f=>({...f,isOutdoor:false}))}>🏠 Trong nhà</button>
              </div>
            </div>
            <div className="ap-field">
              <label>Cường độ</label>
              <div className="ap-toggles">
                {(["low","moderate","high"] as const).map(v=>(
                  <button key={v} className={`ap-tgl ${form.intensity===v?"on":""}`} type="button"
                    onClick={()=>setForm(f=>({...f,intensity:v}))}>{iLabel(v)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="ap-field">
            <label>Ngày trong tuần</label>
            <div className="ap-days">
              {DAYS.map(d=>(
                <button key={d.num} className={`ap-day ${active.includes(d.num)?"on":""}`}
                  type="button" onClick={()=>toggleDay(d.num)}>{d.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="ap-modal__ft">
          <button className="btn btn-secondary" onClick={onClose} type="button">Hủy</button>
          <button className="btn btn-primary" type="button"
            disabled={saving||!form.name.trim()} onClick={()=>onSave(form)}>
            {saving?"Đang lưu...":initial?"Cập nhật":"Thêm hoạt động"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ a, onEdit, onDelete, onGoldenHour }:{
  a:ActivityRisk; onEdit:()=>void; onDelete:()=>void; onGoldenHour:()=>void;
}) {
  const [open, setOpen] = useState(false);
  const color = riskColor(a.riskLevel);
  const score = Math.round(a.riskScore);
  const C = 2*Math.PI*20;

  return (
    <div className="ap-card" style={{"--rc":color} as React.CSSProperties}>
      <div className="ap-card__stripe" style={{background:color}}/>
      <div className="ap-card__body">

        <div className="ap-card__time">
          <strong>{fmtHour(a.hourOfDay,a.minute)}</strong>
          <span>{fmtDur(a.durationMinutes)}</span>
          <small>{timeUntil(a.hourOfDay,a.minute)}</small>
        </div>

        <div className="ap-card__mid">
          <div className="ap-card__name">
            <span className="ap-card__ico">{a.icon}</span>
            <strong>{a.name}</strong>
          </div>
          <div className="ap-card__tags">
            <span className="ap-tag">{a.isOutdoor?"🌤 Ngoài trời":"🏠 Trong nhà"}</span>
            <span className="ap-tag">⚡ {iLabel(a.intensity)}</span>
            <span className="ap-tag ap-tag--pm">PM2.5&nbsp;{a.forecastPm25}</span>
            <span className="ap-tag ap-tag--aqi">AQI&nbsp;{a.forecastAqi}</span>
          </div>
          {open && (
            <div className="ap-card__detail">
              <p className="ap-card__reco">{a.recommendation}</p>
              <div className="ap-card__mults">
                <span>Nhóm ×{a.groupMultiplier}</span>
                <span>Cường độ ×{a.intensityMultiplier}</span>
                {!a.isOutdoor&&<span>Trong nhà ×0.3</span>}
              </div>
              {a.bestAlternativeHour!=null&&a.riskLevel!=="GOOD"&&(
                <div className="ap-alt">💡 Giờ tốt hơn: <strong>{String(a.bestAlternativeHour).padStart(2,"0")}:00</strong></div>
              )}
            </div>
          )}
        </div>

        <div className="ap-card__score">
          <div className="ap-ring">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5"/>
              <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4.5"
                strokeLinecap="round" transform="rotate(-90 24 24)"
                strokeDasharray={`${(score/100)*C} ${C}`}
                style={{transition:"stroke-dasharray .6s ease"}}/>
            </svg>
            <strong style={{color}}>{score}</strong>
          </div>
          <span style={{color,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>
            {riskLabel(a.riskLevel)}
          </span>
        </div>

        <div className="ap-card__acts">
          <button className="ap-btn ap-btn--gold" type="button" onClick={onGoldenHour} title="Chọn giờ vàng">★</button>
          <button className="ap-btn" type="button" onClick={()=>setOpen(v=>!v)}>{open?"▲":"▼"}</button>
          <button className="ap-btn" type="button" onClick={onEdit}>✎</button>
          <button className="ap-btn ap-btn--x" type="button" onClick={onDelete}>✕</button>
        </div>
      </div>
      <div className="ap-card__bar"><div className="ap-card__bar-f" style={{width:`${Math.min(score,100)}%`,background:color}}/></div>
    </div>
  );
}

function SchedRow({ s, onEdit, onDelete }:{ s:ActivitySchedule; onEdit:()=>void; onDelete:()=>void }) {
  const days = s.daysOfWeek.split(",").map(Number).filter(Boolean)
    .map(n=>DAYS.find(d=>d.num===n)?.label??"").join(" · ");
  return (
    <div className="ap-srow">
      <span className="ap-srow__ico">{s.icon}</span>
      <div className="ap-srow__info">
        <strong>{s.name}</strong>
        <span>{fmtHour(s.hourOfDay,s.minute)} · {fmtDur(s.durationMinutes)} · {s.isOutdoor?"Ngoài trời":"Trong nhà"} · {iLabel(s.intensity)}</span>
        <span className="ap-srow__days">{days}</span>
      </div>
      <div className="ap-srow__acts">
        <button className="ap-btn" type="button" onClick={onEdit}>✎</button>
        <button className="ap-btn ap-btn--x" type="button" onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [schedules,    setSchedules]    = useState<ActivitySchedule[]>([]);
  const [forecast,     setForecast]     = useState<ForecastResponse|null>(null);
  const [loadingSched, setLoadingSched] = useState(true);
  const [loadingFore,  setLoadingFore]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<ActivitySchedule|null>(null);
  const [tab, setTab] = useState<"today"|"manage"|"planner">("today");
  const [error,        setError]        = useState("");
  const [goldenTarget, setGoldenTarget] = useState<ActivityRisk|null>(null);

  const loadSched = useCallback(async()=>{
    try { setLoadingSched(true); const d=await http<ActivitySchedule[]>("/api/activity",{method:"GET",auth:true}); setSchedules(d??[]); }
    catch{ /* empty */ } finally{setLoadingSched(false);}
  },[]);

  const loadFore = useCallback(async()=>{
    try { setLoadingFore(true); setError(""); const d=await http<ForecastResponse>("/api/activity/forecast",{method:"GET",auth:true}); setForecast(d); }
    catch(e){ setError(e instanceof Error?e.message:"Không tải được dự báo"); }
    finally{setLoadingFore(false);}
  },[]);

  useEffect(()=>{loadSched();loadFore();},[loadSched,loadFore]);

  async function handleSave(form:FormState){
    try{
      setSaving(true);
      if(editTarget) await http(`/api/activity/${editTarget.id}`,{method:"PUT",auth:true,body:form});
      else await http("/api/activity",{method:"POST",auth:true,body:form});
      setShowModal(false); setEditTarget(null);
      await loadSched(); await loadFore();
    }catch{ /* empty */ }finally{setSaving(false);}
  }

  async function handleDelete(id:number){
    await http(`/api/activity/${id}`,{method:"DELETE",auth:true});
    await loadSched(); await loadFore();
  }

  async function handleApplyHour(activity: ActivityRisk, newHour: number) {
    try {
      await http(`/api/activity/${activity.id}`, {
        method: "PUT", auth: true,
        body: {
          name:            activity.name,
          icon:            activity.icon,
          hourOfDay:       newHour,
          minute:          activity.minute,
          durationMinutes: activity.durationMinutes,
          isOutdoor:       activity.isOutdoor,
          intensity:       activity.intensity,
          daysOfWeek:      activity.daysOfWeek,
        },
      });
      setGoldenTarget(null);
      await loadSched(); await loadFore();
    } catch { /* silent */ }
  }

  async function handlePlannerUpdate(id: number, hourOfDay: number, daysOfWeek: string) {
    const s = schedules.find(x => x.id === id);
    if (!s) return;
    await http(`/api/activity/${id}`, {
      method: "PUT", auth: true,
      body: { ...s, hourOfDay, daysOfWeek },
    });
    await loadSched(); await loadFore();
  }
  async function handleOptimize(payload: {
    name: string; icon: string; hourOfDay: number; minute: number;
    durationMinutes: number; isOutdoor: boolean;
    intensity: "low"|"moderate"|"high"; daysOfWeek: string;
  }) {
    try {
      await http("/api/activity", { method: "POST", auth: true, body: payload });
      await loadSched(); await loadFore();
    } catch { /* silent */ }
  }
  const oc = riskColor(forecast?.overallRisk??"GOOD");
  const goodCnt = forecast?.activities.filter(a=>["GOOD","MODERATE"].includes(a.riskLevel)).length??0;
  const badCnt  = forecast?.activities.filter(a=>["UNHEALTHY","VERY_UNHEALTHY","HAZARDOUS"].includes(a.riskLevel)).length??0;

  return (
    <div className="ap-page">
      <SectionHeader
        eyebrow="🗓 Lịch hoạt động cá nhân"
        title="Dự báo rủi ro theo lịch của bạn"
        description={forecast?`${forecast.date} · Nhóm: ${forecast.userGroup}`:"Phân tích rủi ro PM2.5 cá nhân hóa"}
        rightSlot={
          <div className="ap-hd-right">
            {forecast?.overallRisk&&(
              <div className="ap-overall" style={{background:oc+"18",borderColor:oc+"50",color:oc}}>
                <span style={{fontSize:22}}>{riskEmoji(forecast.overallRisk)}</span>
                <div><span>Tổng thể hôm nay</span><strong>{riskLabel(forecast.overallRisk)}</strong></div>
              </div>
            )}
            <button className="btn btn-primary" type="button" onClick={()=>{setEditTarget(null);setShowModal(true);}}>
              + Thêm hoạt động
            </button>
          </div>
        }
      />

      {forecast&&(
        <div className="section-toolbar">
          <StatusChip label={`${forecast.activities.length} hoạt động`} variant="neutral"/>
          {goodCnt>0&&<StatusChip label={`${goodCnt} an toàn`} variant="success"/>}
          {badCnt>0&&<StatusChip label={`${badCnt} rủi ro cao`} variant="danger"/>}
        </div>
      )}

      {forecast?.daySummary&&(
        <div className="ap-sumbar">
          <span>💡</span><span>{forecast.daySummary}</span>
          <button className="ap-sumbar__refresh" type="button" onClick={()=>{loadSched();loadFore();}}>↺ Làm mới</button>
        </div>
      )}

      <SmartScheduleOptimizer
        existingSchedules={schedules}
        groupMultiplier={forecast?.activities[0]?.groupMultiplier ?? 1.0}
        onApply={handleOptimize}
      />

      <div className="ap-tabs">
        <button className={`ap-tab ${tab==="today"?"on":""}`} type="button" onClick={()=>setTab("today")}>
          📊 Hôm nay ({forecast?.activities.length??0})
        </button>
        <button className={`ap-tab ${tab==="manage"?"on":""}`} type="button" onClick={()=>setTab("manage")}>
          ⚙️ Quản lý lịch ({schedules.length})
        </button>
        <button className={`ap-tab ${tab==="planner"?"on":""}`} type="button" onClick={()=>setTab("planner")}>
          📅 Lịch tuần
        </button>
      </div>

      {tab==="today"&&(
        <div className="ap-content">
          {loadingFore?(
            <div className="ap-loading"><div className="ap-spin"/><span>Đang tính rủi ro theo forecast AI...</span></div>
          ):error?(
            <div className="ap-err"><span>⚠️</span><p>{error}</p><button className="btn btn-secondary" onClick={loadFore} type="button">Thử lại</button></div>
          ):!forecast?.activities.length?(
            <div className="ap-empty">
              <div className="ap-empty__ico">🗓</div>
              <h3>Chưa có hoạt động nào hôm nay</h3>
              <p>Thêm lịch hoạt động để nhận dự báo rủi ro PM2.5 cá nhân hóa.</p>
              <button className="btn btn-primary" type="button" onClick={()=>{setEditTarget(null);setShowModal(true);}}>
                + Thêm hoạt động đầu tiên
              </button>
            </div>
          ):(
            <>
              <div className="ap-cards">
                {forecast.activities.map(a=>(
                  <RiskCard key={a.id} a={a}
                    onEdit={()=>{setEditTarget(a);setShowModal(true);}}
                    onDelete={()=>handleDelete(a.id)}
                    onGoldenHour={()=>setGoldenTarget(a)}
                  />
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <ExposureScoreWidget
                  activities={forecast.activities}
                  backgroundPm25={forecast.activities[0]?.forecastPm25 ?? 25}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <WeeklyRiskMatrix activities={forecast.activities} />
              </div>
            </>
          )}
        </div>
      )}

      {tab==="manage"&&(
        <div className="ap-content">
          {loadingSched?(
            <div className="ap-loading"><div className="ap-spin"/><span>Đang tải...</span></div>
          ):schedules.length===0?(
            <div className="ap-empty">
              <div className="ap-empty__ico">📅</div>
              <h3>Chưa có lịch hoạt động</h3>
              <p>Tạo lịch để hệ thống tự động tính rủi ro mỗi ngày.</p>
              <button className="btn btn-primary" type="button" onClick={()=>{setEditTarget(null);setShowModal(true);}}>+ Thêm lịch đầu tiên</button>
            </div>
          ):(
            <>
              <div className="ap-manage-hd">
                <span className="ap-manage-count">{schedules.length}/10 hoạt động</span>
                <button className="btn btn-primary" type="button" disabled={schedules.length>=10}
                  onClick={()=>{setEditTarget(null);setShowModal(true);}}>+ Thêm</button>
              </div>
              <div className="ap-srows">
                {schedules.map(s=>(
                  <SchedRow key={s.id} s={s}
                    onEdit={()=>{setEditTarget(s);setShowModal(true);}}
                    onDelete={()=>handleDelete(s.id)}
                  />
                ))}
              </div>
              <p className="ap-manage-note">* Lịch được dùng để tính điểm rủi ro mỗi ngày theo dự báo AQI từ AI Server.</p>
            </>
          )}
        </div>
      )}

      {tab==="planner"&&(
        <div className="ap-content">
          <WeeklyPlannerView
            schedules={schedules}
            onUpdate={handlePlannerUpdate}
            onQuickAdd={(dayIndex, hour) => {
              setEditTarget(null);
              setShowModal(true);
              setTab("planner");
              void dayIndex; void hour; 
            }}
            onDelete={handleDelete}
          />
        </div>
      )}

      {showModal&&(
        <ActivityModal
          initial={editTarget??undefined}
          onSave={handleSave}
          onClose={()=>{setShowModal(false);setEditTarget(null);}}
          saving={saving}
        />
      )}

      {goldenTarget&&(
        <GoldenHourPicker
          activityName={goldenTarget.name}
          activityIcon={goldenTarget.icon}
          currentHour={goldenTarget.hourOfDay}
          currentMinute={goldenTarget.minute}
          groupMultiplier={goldenTarget.groupMultiplier}
          intensityMultiplier={goldenTarget.intensityMultiplier}
          isOutdoor={goldenTarget.isOutdoor}
          onSelectHour={(h)=>handleApplyHour(goldenTarget,h)}
          onClose={()=>setGoldenTarget(null)}
        />
      )}
    </div>
  );
}
