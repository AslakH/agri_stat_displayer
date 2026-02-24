import { describe, expect, test } from "vitest";
import { parseNorgeHtml, parseNorgeRowFromCells } from "./agricolaNorge";

describe("agricola norge parser", () => {
  test("parses single row values", () => {
    const row = parseNorgeRowFromCells(
      ["Occupation", "uuid-123", "Clay Worker", "xoccup-ClayWorker_123_4", "0", "1,250", "800", "510", "130", "5.0", "0.8", "0.3"],
      {
        cardType: 0,
        cardUuid: 1,
        cardName: 2,
        playAgricolaCardName: 3,
        bannedCount: 4,
        dealtCount: 5,
        draftedCount: 6,
        playedCount: 7,
        wonCount: 8,
        adp: 9,
        pwr: 10,
        pwrNoLog: 11
      }
    );

    expect(row?.name).toBe("Clay Worker");
    expect(row?.stat.wonCount).toBe(130);
    expect(row?.stat.sampleSize).toBe(1250);
  });

  test("parses HTML table", () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>card_type</th><th>card_uuid</th><th>card_name</th><th>play_agricola_card_name</th><th>banned</th><th>dealt</th><th>drafted</th><th>played</th><th>won</th><th>ADP</th><th>PWR</th><th>PWR_no_log</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MinorImprovement</td><td>uuid-1</td><td>Loom</td><td>xminor-Loom_987_4</td><td>0</td><td>1000</td><td>600</td><td>350</td><td>90</td><td>5.5</td><td>0.6</td><td>0.3</td>
          </tr>
        </tbody>
      </table>
    `;

    const parsed = parseNorgeHtml(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Loom");
    expect(parsed[0].stat.pwr).toBe(0.6);
    expect(parsed[0].stat.dealtCount).toBe(1000);
  });
});
