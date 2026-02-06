import { clsx } from "clsx";

interface Score {
  id: number;
  holeNumber: number;
  grossScore: number;
  netScore: number | null;
  stablefordPoints: number | null;
  handicapUsed: number | null;
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
}

export function ScoreboardTable({ playerScores, holes, roundFormat, compact = false }: ScoreboardTableProps) {
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

    return (
      <div key={sectionLabel} className={compact ? "mb-3" : "mb-6"}>
        {!compact && <h4 className="font-bold text-sm mb-2">{sectionLabel}</h4>}
        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
          <table className={clsx("w-full", compact ? "text-xs" : "text-sm")}>
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="px-2 py-2 text-left font-bold">Hole</th>
                {holeNumbers.map(h => (
                  <th key={h} className="px-1.5 py-2 text-center font-bold">{h}</th>
                ))}
                {!compact && <th className="px-1.5 py-2 text-center font-bold">{sectionLabel === 'FRONT 9' ? 'Out' : 'In'}</th>}
              </tr>
            </thead>
            <tbody>
              {/* Par row */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Par</td>
                {holeNumbers.map(h => {
                  const hole = getHole(h);
                  return (
                    <td key={h} className="px-1.5 py-2 text-center text-slate-900 dark:text-slate-100">
                      {hole?.par || '-'}
                    </td>
                  );
                })}
                {!compact && <td className="px-1.5 py-2 text-center font-bold text-slate-900 dark:text-slate-100">{parOut}</td>}
              </tr>

              {/* Stroke row - hidden in compact mode */}
              {!compact && (
              <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <td className="px-2 py-2 font-semibold text-slate-600 dark:text-slate-400">Stroke</td>
                {holeNumbers.map(h => {
                  const hole = getHole(h);
                  return (
                    <td key={h} className="px-1.5 py-2 text-center text-slate-600 dark:text-slate-400">
                      {hole?.strokeIndex || '-'}
                    </td>
                  );
                })}
                <td className="px-1.5 py-2 text-center text-slate-600 dark:text-slate-400">-</td>
              </tr>
              )}

              {/* Score row */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Score</td>
                {holeNumbers.map(h => {
                  const score = getScore(h);
                  const hole = getHole(h);
                  const grossScore = score?.grossScore;
                  const par = hole?.par || 4;

                  return (
                    <td
                      key={h}
                      className={clsx(
                        "px-1.5 py-2 text-center rounded",
                        grossScore && getScoreColor(grossScore, par)
                      )}
                    >
                      {grossScore || '-'}
                    </td>
                  );
                })}
                {!compact && <td className="px-1.5 py-2 text-center font-bold text-slate-900 dark:text-slate-100">
                  {scoreOut}
                </td>}
              </tr>

              {/* Net row */}
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Net</td>
                {holeNumbers.map(h => {
                  const score = getScore(h);
                  const netScore = score?.netScore;
                  return (
                    <td key={h} className="px-1.5 py-2 text-center text-slate-900 dark:text-slate-100">
                      {netScore !== null && netScore !== undefined ? netScore : '-'}
                    </td>
                  );
                })}
                {!compact && <td className="px-1.5 py-2 text-center font-bold text-slate-900 dark:text-slate-100">{netOut}</td>}
              </tr>
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
  const toPar = totalScore - totalPar;

  const frontPar = calculateSum(front9, 'par');
  const frontScore = calculateSum(front9, 'grossScore');
  const backScore = calculateSum(back9, 'grossScore');

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {renderNine(front9, 'FRONT 9')}
      {renderNine(back9, 'BACK 9')}

      {/* Summary Stats - hidden in compact mode */}
      {!compact && (
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Par</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPar}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Score</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalScore}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Net</div>
            <div className="text-2xl font-bold text-primary">{totalNet}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">To Par</div>
            <div className={clsx(
              "text-2xl font-bold",
              toPar < 0 ? "text-red-600" : toPar > 0 ? "text-blue-600" : "text-slate-900 dark:text-slate-100"
            )}>
              {toPar > 0 ? '+' : ''}{toPar}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
