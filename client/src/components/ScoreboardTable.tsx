import { clsx } from "clsx";

interface Score {
  id: number;
  holeNumber: number;
  grossScore: number;
  netScore: number | null;
  stablefordPoints: number | null;
  handicapUsed: number | null;
  gir: boolean | null;
  fir: boolean | null;
  putts: number | null;
}

interface Hole {
  number: number;
  par: number;
  strokeIndex: number;
}

interface ScoreboardTableProps {
  playerScores: Score[];
  holes: Hole[];
  roundFormat?: string;
  compact?: boolean;
  courseHandicap?: number;
  showStats?: boolean;
}

export function ScoreboardTable({ playerScores, holes, roundFormat, compact = false, courseHandicap, showStats = false }: ScoreboardTableProps) {
  // Sort scores by hole number
  const sortedScores = [...playerScores].sort((a, b) => a.holeNumber - b.holeNumber);

  // Helper to get hole data
  const getHole = (holeNumber: number) => holes.find(h => h.number === holeNumber);

  // Helper to get score for a hole
  const getScore = (holeNumber: number) => sortedScores.find(s => s.holeNumber === holeNumber);

  // Color for score based on performance vs par
  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return "bg-amber-100 text-amber-700 font-bold";  // Eagle (gold)
    if (diff === -1) return "bg-red-100 text-red-700 font-bold";     // Birdie (red)
    if (diff === 0)  return "bg-gray-100 text-gray-900 font-bold";   // Par (default)
    if (diff === 1)  return "bg-blue-100 text-blue-600 font-bold";   // Bogey (light blue)
    return "bg-blue-900 text-white font-bold";                       // Double+ (dark blue)
  };

  // Calculate sums for a set of holes
  const calculateSum = (holeNumbers: number[], field: 'grossScore' | 'netScore' | 'par' | 'par' = 'grossScore') => {
    if (field === 'par') {
      return holeNumbers.reduce((sum, holeNum) => {
        const hole = getHole(holeNum);
        return sum + (hole?.par || 0);
      }, 0);
    }

    return holeNumbers.reduce((sum, holeNum) => {
      const score = getScore(holeNum);
      if (field === 'grossScore') return sum + (score?.grossScore || 0);
      if (field === 'netScore') return sum + (score?.netScore || 0);
      return sum;
    }, 0);
  };

  // Front 9 and Back 9 hole numbers
  const front9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const back9 = [10, 11, 12, 13, 14, 15, 16, 17, 18];

  const renderNine = (holeNumbers: number[], sectionLabel: string) => {
    const scoreOut = calculateSum(holeNumbers, 'grossScore');
    const netOut = calculateSum(holeNumbers, 'netScore');
    const parOut = calculateSum(holeNumbers, 'par');

    // Calculate stableford points total for this nine
    const ptsOut = holeNumbers.reduce((sum, holeNum) => {
      const score = getScore(holeNum);
      return sum + (score?.stablefordPoints || 0);
    }, 0);

    return (
      <div key={sectionLabel} className={compact ? "mb-3" : "mb-6"}>
        {!compact && <h4 className="font-bold text-sm mb-2">{sectionLabel}</h4>}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
          <table className={clsx("w-full", compact ? "text-xs" : "text-xs sm:text-sm")}>
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-bold whitespace-nowrap">Hole</th>
                {holeNumbers.map(h => (
                  <th key={h} className="px-0.5 sm:px-1.5 py-1.5 sm:py-2 text-center font-bold">{h}</th>
                ))}
                <th className="px-0.5 sm:px-1.5 py-1.5 sm:py-2 text-center font-bold">{sectionLabel === 'FRONT 9' ? 'Out' : 'In'}</th>
              </tr>
            </thead>
            <tbody>
              {/* Par row */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-1 sm:px-2 py-1 sm:py-2 font-semibold text-slate-700 dark:text-slate-300">Par</td>
                {holeNumbers.map(h => {
                  const hole = getHole(h);
                  return (
                    <td key={h} className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center text-slate-900 dark:text-slate-100">
                      {hole?.par || '-'}
                    </td>
                  );
                })}
                <td className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center font-bold text-slate-900 dark:text-slate-100">{parOut}</td>
              </tr>

              {/* Stroke row */}
              <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <td className="px-1 sm:px-2 py-1 sm:py-2 font-semibold text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">Stroke</td>
                {holeNumbers.map(h => {
                  const hole = getHole(h);
                  return (
                    <td key={h} className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">
                      {hole?.strokeIndex || '-'}
                    </td>
                  );
                })}
                <td className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center text-slate-600 dark:text-slate-400">-</td>
              </tr>

              {/* Score row */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-1 sm:px-2 py-1 sm:py-2 font-semibold text-slate-700 dark:text-slate-300">Score</td>
                {holeNumbers.map(h => {
                  const score = getScore(h);
                  const hole = getHole(h);
                  const grossScore = score?.grossScore;
                  const par = hole?.par || 4;

                  return (
                    <td
                      key={h}
                      className={clsx(
                        "px-0.5 sm:px-1.5 py-1 sm:py-2 text-center rounded",
                        grossScore && getScoreColor(grossScore, par)
                      )}
                    >
                      {grossScore || '-'}
                    </td>
                  );
                })}
                <td className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center font-bold text-slate-900 dark:text-slate-100">
                  {scoreOut}
                </td>
              </tr>

              {/* Net row - hidden in compact mode */}
              {!compact && (
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-1 sm:px-2 py-1 sm:py-2 font-semibold text-slate-700 dark:text-slate-300">Net</td>
                {holeNumbers.map(h => {
                  const score = getScore(h);
                  const netScore = score?.netScore;
                  return (
                    <td key={h} className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center text-slate-900 dark:text-slate-100">
                      {netScore !== null && netScore !== undefined ? netScore : '-'}
                    </td>
                  );
                })}
                <td className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center font-bold text-slate-900 dark:text-slate-100">{netOut}</td>
              </tr>
              )}

              {/* Stableford Points row - shown in larger scorecards and compact leaderboard */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-1 sm:px-2 py-1 sm:py-2 font-semibold text-slate-700 dark:text-slate-300">Pts</td>
                {holeNumbers.map(h => {
                  const score = getScore(h);
                  const stablefordPoints = score?.stablefordPoints;
                  return (
                    <td key={h} className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center text-slate-900 dark:text-slate-100">
                      {stablefordPoints !== null && stablefordPoints !== undefined ? stablefordPoints : '-'}
                    </td>
                  );
                })}
                <td className="px-0.5 sm:px-1.5 py-1 sm:py-2 text-center font-bold text-slate-900 dark:text-slate-100">{ptsOut}</td>
              </tr>

              {/* FIR row */}
              {showStats && !compact && (() => {
                const firHoles = holeNumbers.filter(h => getHole(h)?.par !== 3);
                const firHits = firHoles.filter(h => getScore(h)?.fir === true).length;
                const firTracked = firHoles.filter(h => getScore(h)?.fir !== null && getScore(h)?.fir !== undefined).length;
                return (
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/30">
                    <td className="px-2 py-1.5 font-semibold text-blue-700 dark:text-blue-400 text-xs">FIR</td>
                    {holeNumbers.map(h => {
                      const hole = getHole(h);
                      const score = getScore(h);
                      const isPar3 = hole?.par === 3;
                      const fir = score?.fir;
                      return (
                        <td key={h} className={clsx("px-1.5 py-1.5 text-center text-xs", isPar3 && "bg-slate-100 dark:bg-slate-800")}>
                          {isPar3 ? <span className="text-slate-300">-</span> :
                           fir === true ? <span className="text-blue-600 font-bold">&#10003;</span> :
                           fir === false ? <span className="text-red-400">&#10007;</span> :
                           <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-1.5 text-center text-xs font-bold text-blue-700 dark:text-blue-400">
                      {firTracked > 0 ? `${firHits}/${firTracked}` : '-'}
                    </td>
                  </tr>
                );
              })()}

              {/* GIR row */}
              {showStats && !compact && (() => {
                const girHits = holeNumbers.filter(h => getScore(h)?.gir === true).length;
                const girTracked = holeNumbers.filter(h => getScore(h)?.gir !== null && getScore(h)?.gir !== undefined).length;
                return (
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30">
                    <td className="px-2 py-1.5 font-semibold text-emerald-700 dark:text-emerald-400 text-xs">GIR</td>
                    {holeNumbers.map(h => {
                      const score = getScore(h);
                      const gir = score?.gir;
                      return (
                        <td key={h} className="px-1.5 py-1.5 text-center text-xs">
                          {gir === true ? <span className="text-emerald-600 font-bold">&#10003;</span> :
                           gir === false ? <span className="text-red-400">&#10007;</span> :
                           <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-1.5 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {girTracked > 0 ? `${girHits}/${girTracked}` : '-'}
                    </td>
                  </tr>
                );
              })()}

              {/* Putts row */}
              {showStats && !compact && (() => {
                const puttsSum = holeNumbers.reduce((sum, h) => sum + (getScore(h)?.putts ?? 0), 0);
                const puttsTracked = holeNumbers.filter(h => getScore(h)?.putts !== null && getScore(h)?.putts !== undefined).length;
                return (
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-400 text-xs">Putts</td>
                    {holeNumbers.map(h => {
                      const score = getScore(h);
                      const putts = score?.putts;
                      return (
                        <td key={h} className="px-1.5 py-1.5 text-center text-xs text-slate-700 dark:text-slate-300">
                          {putts !== null && putts !== undefined ? putts : '-'}
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-1.5 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      {puttsTracked > 0 ? puttsSum : '-'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Calculate totals
  const totalPar = calculateSum([...front9, ...back9], 'par');
  const totalScore = calculateSum([...front9, ...back9], 'grossScore');
  const totalNet = calculateSum([...front9, ...back9], 'netScore');

  // Calculate total stableford points
  const allHoles = [...front9, ...back9];
  const totalStableford = allHoles.reduce((sum, holeNum) => {
    const score = getScore(holeNum);
    return sum + (score?.stablefordPoints || 0);
  }, 0);

  const toPar = totalScore - totalPar;

  const frontPar = calculateSum(front9, 'par');
  const frontScore = calculateSum(front9, 'grossScore');
  const backScore = calculateSum(back9, 'grossScore');

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {/* Course Handicap indicator - shown in larger scorecards only */}
      {!compact && courseHandicap !== undefined && (
        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Course HCP: <span className="font-bold text-slate-900 dark:text-slate-100">{courseHandicap}</span>
        </div>
      )}

      {renderNine(front9, 'FRONT 9')}
      {renderNine(back9, 'BACK 9')}

      {/* Summary Stats - hidden in compact mode */}
      {!compact && (() => {
        const allGirHits = allHoles.filter(h => getScore(h)?.gir === true).length;
        const allGirTracked = allHoles.filter(h => getScore(h)?.gir !== null && getScore(h)?.gir !== undefined).length;
        const allFirHoles = allHoles.filter(h => getHole(h)?.par !== 3);
        const allFirHits = allFirHoles.filter(h => getScore(h)?.fir === true).length;
        const allFirTracked = allFirHoles.filter(h => getScore(h)?.fir !== null && getScore(h)?.fir !== undefined).length;
        const allPuttsSum = allHoles.reduce((sum, h) => sum + (getScore(h)?.putts ?? 0), 0);
        const allPuttsTracked = allHoles.filter(h => getScore(h)?.putts !== null && getScore(h)?.putts !== undefined).length;
        const hasStats = showStats && (allGirTracked > 0 || allFirTracked > 0 || allPuttsTracked > 0);

        return (
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2.5 sm:p-4">
            <div className={clsx("grid gap-2 sm:gap-4", hasStats ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5")}>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Par</div>
                <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPar}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Score</div>
                <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalScore}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Net</div>
                <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{totalNet}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Points</div>
                <div className="text-lg sm:text-2xl font-bold text-primary">{totalStableford}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">To Par</div>
                <div className={clsx(
                  "text-lg sm:text-2xl font-bold",
                  toPar < 0 ? "text-red-600" : toPar > 0 ? "text-blue-600" : "text-slate-900 dark:text-slate-100"
                )}>
                  {toPar > 0 ? '+' : ''}{toPar}
                </div>
              </div>
              {hasStats && (
                <>
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">FIR</div>
                    <div className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {allFirTracked > 0 ? `${Math.round((allFirHits / allFirTracked) * 100)}%` : '-'}
                    </div>
                    {allFirTracked > 0 && (
                      <div className="text-xs text-slate-500">{allFirHits}/{allFirTracked}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">GIR</div>
                    <div className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {allGirTracked > 0 ? `${Math.round((allGirHits / allGirTracked) * 100)}%` : '-'}
                    </div>
                    {allGirTracked > 0 && (
                      <div className="text-xs text-slate-500">{allGirHits}/{allGirTracked}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Putts</div>
                    <div className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-300">
                      {allPuttsTracked > 0 ? allPuttsSum : '-'}
                    </div>
                    {allPuttsTracked > 0 && (
                      <div className="text-xs text-slate-500">{(allPuttsSum / allPuttsTracked).toFixed(1)}/hole</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
