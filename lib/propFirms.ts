export type FirmStatus = 'safe' | 'caution' | 'risky';

export interface PropFirm {
  key: string;
  name: string;
  status: FirmStatus;
  drawdown: string;
  payout: string;
  news: string;
  url: string;
  updated: string;
  risk: number;
}

export const PROP_FIRMS: PropFirm[] = [
  { key: 'ftmo',        name: 'FTMO',                 status: 'safe',    drawdown: '5% daily / 10% max', payout: '80–90%', news: 'Restricted',      url: 'https://ftmo.com/en/terms-conditions/',                  updated: '2 days ago',  risk: 28 },
  { key: 'apex',        name: 'Apex Trader Funding',  status: 'caution', drawdown: '6% daily / 12% max', payout: '90%',    news: 'Allowed',          url: 'https://apextraderfunding.com/terms-and-conditions',     updated: '1 day ago',   risk: 45 },
  { key: 'the5ers',     name: 'The5ers',              status: 'safe',    drawdown: '4% daily / 8% max',  payout: '80%',    news: 'Restricted',       url: 'https://the5ers.com/terms/',                             updated: '5 days ago',  risk: 32 },
  { key: 'mff',         name: 'MyFundedFX',           status: 'caution', drawdown: '5% daily / 10% max', payout: '75–85%', news: 'Restricted',       url: 'https://myfundedfx.com/terms/',                          updated: '3 days ago',  risk: 51 },
  { key: 'tft',         name: 'The Funded Trader',    status: 'risky',   drawdown: '5% daily / 10% max', payout: '80%',    news: 'Restricted',       url: 'https://thefundedtrader.com/terms',                      updated: '1 week ago',  risk: 67 },
  { key: 'fundednext',  name: 'FundedNext',           status: 'safe',    drawdown: '5% daily / 10% max', payout: '80–90%', news: 'Allowed (select)', url: 'https://fundednext.com/terms-conditions',                updated: '4 days ago',  risk: 35 },
  { key: 'blueguardian',name: 'Blue Guardian',        status: 'safe',    drawdown: '5% daily / 10% max', payout: '80–85%', news: 'Restricted',       url: 'https://blueguardian.io/terms',                          updated: '3 days ago',  risk: 30 },
  { key: 'e8',          name: 'E8 Funding',           status: 'caution', drawdown: '5% daily / 8% max',  payout: '80%',    news: 'Restricted',       url: 'https://e8funding.com/terms-and-conditions',             updated: '6 days ago',  risk: 42 },
  { key: 'topstep',     name: 'Topstep',              status: 'safe',    drawdown: '3% daily / 6% max',  payout: '100%',   news: 'Allowed',          url: 'https://topstep.com/terms-of-use/',                      updated: '2 days ago',  risk: 26 },
  { key: 'trueforex',   name: 'True Forex Funds',     status: 'caution', drawdown: '5% daily / 10% max', payout: '75–80%', news: 'Restricted',       url: 'https://trueforexfunds.com/terms-and-conditions/',       updated: '5 days ago',  risk: 48 },
  { key: 'fte',         name: 'Funded Trading Plus',  status: 'caution', drawdown: '5% daily / 10% max', payout: '80%',    news: 'Restricted',       url: 'https://www.fundedtradingplus.com/terms-and-conditions', updated: '1 week ago',  risk: 44 },
  { key: 'aquafunded',  name: 'Aqua Funded',          status: 'safe',    drawdown: '5% daily / 10% max', payout: '85%',    news: 'Allowed',          url: 'https://aquafunded.com/terms/',                          updated: '4 days ago',  risk: 34 },
  { key: 'goatfunded',  name: 'GOAT Funded Trader',   status: 'caution', drawdown: '5% daily / 10% max', payout: '80%',    news: 'Restricted',       url: 'https://goatfundedtrader.com/terms-conditions/',         updated: '3 days ago',  risk: 46 },
  { key: 'fxify',       name: 'FXIFY',                status: 'safe',    drawdown: '4% daily / 8% max',  payout: '80–90%', news: 'Restricted',       url: 'https://fxify.com/terms-and-conditions/',                updated: '2 days ago',  risk: 33 },
];
