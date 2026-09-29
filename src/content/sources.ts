export const SOURCES = {
  'acsm-2009':
    'American College of Sports Medicine (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise, 41(3), 687–708.',
  'schoenfeld-2017-volume':
    'Schoenfeld, Ogborn & Krieger (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis. Journal of Sports Sciences, 35(11), 1073–1082.',
  'schoenfeld-2017-load':
    'Schoenfeld, Grgic, Ogborn & Krieger (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training: a systematic review and meta-analysis. Journal of Strength and Conditioning Research, 31(12), 3508–3523.',
  'schoenfeld-2016-rest':
    'Schoenfeld et al. (2016). Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. Journal of Strength and Conditioning Research, 30(7), 1805–1812.',
  'schoenfeld-2016-frequency':
    'Schoenfeld, Ogborn & Krieger (2016). Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Medicine, 46(11), 1689–1697.',
  'helms-2016-rir':
    'Helms et al. (2016). Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training. Strength and Conditioning Journal, 38(4), 42–49.',
  'staron-1991':
    'Staron et al. (1991). Strength and skeletal muscle adaptations in heavy-resistance-trained women after detraining and retraining. Journal of Applied Physiology, 70(2), 631–640.',
  'seaborne-2018':
    'Seaborne et al. (2018). Human skeletal muscle possesses an epigenetic memory of hypertrophy. Scientific Reports, 8, 1898.',
  'nsca-estc':
    'Haff & Triplett (Eds.) (2016). Essentials of Strength Training and Conditioning, 4th ed. National Strength and Conditioning Association / Human Kinetics.',
} as const

export type SourceKey = keyof typeof SOURCES
