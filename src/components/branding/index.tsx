import { LEAGUE_LOGO_SRC, teamLogoSrc } from "@/config/branding";
import type { Player } from "@/types/player";
import { playerDisplayName, shouldShowPlayerName } from "@/lib/playerDisplay";

export const CREST_SIZES = {
    xs: { box: "w-8 h-8" },
    sm: { box: "w-10 h-10" },
    md: { box: "w-12 h-12" },
    lg: { box: "w-16 h-16" },
    xl: { box: "w-20 h-20" },
    profile: { box: "w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44" }
};

export const TeamCrest = ({ fplId, size = "md", className = "", framed = true, profile = false }) => {
    const s = CREST_SIZES[size] || CREST_SIZES.md;
    if (!fplId) {
        return <div className={`${s.box} rounded-lg border-2 border-dashed border-slate-600 shrink-0 ${className}`} />;
    }
    const frameClass = framed ? (profile ? "crest-frame crest-frame-profile" : "crest-frame") : "";
    return (
        <div className={`${s.box} shrink-0 flex items-center justify-center ${frameClass} ${className}`}>
            <img
                src={teamLogoSrc(fplId)}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
            />
        </div>
    );
};

export const LeagueLogo = ({ size = "md", className = "" }) => {
    const sizes = {
        sm: "h-8",
        md: "h-10",
        lg: "h-14",
        xl: "h-20",
        hero: "h-24 md:h-28"
    };
    return (
        <img
            src={LEAGUE_LOGO_SRC}
            alt="FPL Arena"
            className={`object-contain w-auto ${sizes[size] || sizes.md} ${className}`}
        />
    );
};

export const TeamBrand = ({ player, crestSize = "sm", nameClassName = "text-slate-200", subClassName = "", layout = "row" }) => {
    if (!player) return null;
    const isCol = layout === "col";
    return (
        <div className={`flex ${isCol ? "flex-col items-start" : "items-start"} gap-3 min-w-0`}>
            <TeamCrest fplId={player.id} size={crestSize} className="shrink-0" />
            <div className={`min-w-0 ${isCol ? "w-full" : "flex-1"}`}>
                <div className={`font-bold leading-snug break-words ${nameClassName}`}>{player.team}</div>
                {shouldShowPlayerName(player) ? (
                    <div className={`text-xs text-slate-500 leading-snug break-words mt-0.5 ${subClassName}`}>
                        {playerDisplayName(player)}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
