import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Clock, ExternalLink, BookOpen, Tag, Sparkles, ShieldCheck, Hourglass, CheckCircle } from 'lucide-react';

const ComicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------
  // 🔴 請將下方的網址改成您 Render 後端的實際網址 (不要有最後的斜線)
  // ---------------------------------------------------------
  const BACKEND_URL = "https://你的後端網址.onrender.com"; 

  useEffect(() => {
    const fetchComic = async () => {
      try {
        // ✅ 已修改：使用雲端網址
        const res = await axios.get(`${BACKEND_URL}/api/comics`);
        const foundComic = res.data.find(c => String(c.id) === String(id));
        setTimeout(() => {
          setComic(foundComic);
          setLoading(false);
        }, 300);
      } catch (error) {
        console.error("讀取失敗:", error);
        setLoading(false);
      }
    };
    fetchComic();
  }, [id, BACKEND_URL]);

  // ✅ 已修改：使用雲端網址
  const getImg = (url) => `${BACKEND_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex justify-center items-start pt-10">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col animate-pulse border border-green-100">
          <div className="w-full h-[180px] bg-slate-200"></div>
          <div className="p-8 w-full space-y-5">
            <div className="h-8 bg-slate-200 rounded-full w-1/3"></div>
            <div className="h-20 bg-slate-200 rounded-2xl w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!comic) return <div className="p-20 text-center text-xl font-bold text-slate-400">找不到這部漫畫 🥲</div>;

  const accessText = comic.access || comic.episodes || '';
  // 狀態標籤配色調整：更乾淨現代
  let statusTag = { text: "連載中", color: "bg-orange-100 text-orange-600 border-orange-200", icon: <Hourglass size={12} className="mr-1"/> };

  if (accessText.includes('追漫券')) {
    statusTag = { text: "需追漫券", color: "bg-purple-100 text-purple-600 border-purple-200", icon: <ShieldCheck size={12} className="mr-1"/> };
  } else if (accessText.includes('完結') || accessText.includes('免費看完整')) {
    // 完結使用 Webtoon 綠
    statusTag = { text: "已完結", color: "bg-emerald-100 text-emerald-600 border-emerald-200", icon: <CheckCircle size={12} className="mr-1"/> };
  }

  return (
    // 1. 全局背景：Webtoon 風格的清新淺綠漸層
    <div className="min-h-screen bg-[#f8fff9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-white to-white pb-12 relative font-sans text-slate-800 overflow-hidden">
      
      {/* 動態升級：微妙的背景呼吸光暈 */}
      <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-emerald-200/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none"></div>

      {/* 導航列 */}
      <div className="sticky top-0 z-40 px-4 py-4 flex justify-center">
        <div className="w-full max-w-4xl flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-600 hover:text-emerald-600 bg-white/80 hover:bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-bold backdrop-blur-md border border-white/60 group hover:-translate-x-0.5"
          >
            <ArrowLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-0.5" /> 返回
          </button>

          <div 
            onClick={() => navigate('/')}
            className="hidden md:flex items-center cursor-pointer hover:scale-105 transition-transform duration-300 group"
          >
            {/* Logo 使用亮綠色 */}
            <BookOpen className="mr-2 text-emerald-500 drop-shadow-sm group-hover:text-emerald-600 transition-colors" size={24} strokeWidth={2.5} /> 
            <span className="font-extrabold text-xl text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
              漫畫補給站
            </span>
          </div>
        </div>
      </div>

      {/* 主要卡片容器 */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-4 mt-2 animate-fade-in-up">
        {/* 卡片：乾淨白底，搭配更深的陰影突出感 */}
        <div className="bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col border border-slate-100">
          
          {/* === 圖片區塊 (保持緊湊尺寸) === */}
          <div className="w-full relative h-[150px] md:h-[200px] bg-slate-50 group overflow-hidden flex justify-center items-center py-1">
             
            {/* 底層：模糊背景 (稍微調淡，讓前景更突出) */}
            <div 
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 saturate-150 transition-all duration-700"
                style={{ backgroundImage: `url(${getImg(comic.picture)})` }}
            ></div>
            
            {/* 上層：完整圖片 (陰影更柔和) */}
            <img 
              src={getImg(comic.picture)} 
              alt={comic.title} 
              className="relative h-full w-auto object-contain z-10 shadow-xl shadow-slate-900/10 rounded-lg ring-1 ring-black/5 transition-transform duration-700 group-hover:scale-[1.02] my-1"
            />
            
            {/* 類別標籤：使用 Webtoon 綠 */}
            <div className="absolute bottom-3 left-6 z-20">
               <span className="bg-emerald-500/90 text-white px-3 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md flex items-center shadow-lg hover:scale-105 transition-transform hover:bg-emerald-600">
                  <Tag size={10} className="mr-1.5 text-white fill-white"/> {comic.genre}
                </span>
            </div>
          </div>

          {/* 下方資訊區 */}
          <div className="w-full p-6 md:p-8 flex flex-col relative bg-white">
            
            {/* 標題與按鈕 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pb-6 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`${statusTag.color} px-3 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm border`}>
                    {statusTag.icon} {statusTag.text}
                  </span>
                  <span className="text-slate-500 text-[10px] font-bold flex items-center bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    <Clock size={10} className="mr-1.5 text-slate-400"/> {comic.crawl_date?.split(' ')[0]} 更新
                  </span>
                </div>
                
                {/* 標題：深色系，乾淨有力 */}
                <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight drop-shadow-sm pr-2">
                  {comic.title}
                </h1>
              </div>
               
               {/* 動態升級：Webtoon 風格主按鈕 (亮綠漸層 + Q彈效果 + 強光澤) */}
               <div className="md:w-auto w-full shrink-0">
                <a 
                    href={comic.hyperlink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group relative w-full md:w-auto flex items-center justify-center py-3.5 px-10 bg-gradient-to-r from-[#00dc64] to-[#00c85a] hover:from-[#00e66e] hover:to-[#00dc64] text-white text-sm font-extrabold rounded-2xl shadow-[0_8px_20px_-5px_rgba(0,220,100,0.5)] hover:shadow-[0_12px_25px_-5px_rgba(0,220,100,0.6)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-95 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center drop-shadow">
                      立即閱讀 <ExternalLink size={18} className="ml-2 group-hover:translate-x-0.5 transition-transform text-white" strokeWidth={2.5} />
                    </span>
                    {/* 強烈的光澤掃過動畫 */}
                    <div className="absolute top-0 left-0 w-[150%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shine"></div>
                </a>
               </div>
            </div>

            {/* 資訊卡片區 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard 
                icon={<User size={20} />} 
                label="作者" 
                value={comic.author} 
              />
              <InfoCard 
                icon={<BookOpen size={20} />} 
                label="目前話數" 
                value={comic.episodes} 
              />
              {/* highlight 屬性讓這個卡片更突出 */}
              <InfoCard 
                icon={<Sparkles size={20} />} 
                label="閱讀權限" 
                value={comic.access || "一般連載中"} 
                highlight={true}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// 動態升級：Webtoon 風格資訊卡片
const InfoCard = ({ icon, label, value, highlight = false }) => {
  return (
    <div className={`
      flex items-center p-4 rounded-2xl border bg-white shadow-sm
      transition-all duration-300 group cursor-pointer
      /* Hover 動態：邊框變綠，輕微上浮，陰影加深 */
      hover:border-emerald-400 hover:shadow-[0_8px_20px_-8px_rgba(0,220,100,0.4)] hover:-translate-y-1
      ${highlight ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'}
    `}>
      {/* Icon 區塊：Hover 時背景變綠色 */}
      <div className={`
        p-3 rounded-xl mr-4 transition-all duration-300 
        group-hover:bg-emerald-500 group-hover:text-white
        ${highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}
      `}>
        {icon}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <p className="text-[10px] text-slate-400 mb-0.5 font-bold tracking-wider uppercase">{label}</p>
        {/* 數值：Hover 時文字變綠色 */}
        <p className={`text-base font-extrabold truncate transition-colors duration-300 group-hover:text-emerald-600 ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>
          {value}
        </p>
      </div>
    </div>
  );
};

export default ComicDetail;