import type { WorkshopProgram } from "./types";

// design/icerik.md → "Atölye: Kahveye giriş". Coffee facts come from there only.
export const kahveyeGiris: WorkshopProgram = {
  name: "Kahveye giriş",
  lead: "İki saatte üç demleme yöntemi ve bir mini tadım.",
  audience: "Kahveyi seven ama nereden başlayacağını bilmeyen herkes. Hiçbir ön bilgi gerekmez.",
  steps: [
    {
      title: "Kahve nedir?",
      minutes: 20,
      body: "Meyveden fincana: Arabica ile Robusta farkı ve işleme yönteminin tadı nasıl değiştirdiği.",
    },
    {
      title: "Kavurma ve tazelik",
      minutes: 15,
      body: "Açık ve koyu kavrum farkı, kavrum tarihinin neden önemli olduğu.",
    },
    {
      title: "Demleme pratiği",
      minutes: 60,
      body: "Aynı çekirdeği V60 ve French press ile demliyoruz. Sonra öğütmeyi değiştirip ekşi ve acı fincanı yan yana tadıyoruz.",
    },
    {
      title: "Mini tadım",
      minutes: 25,
      body: "İki üç farklı menşe; tat notalarını birlikte yazıyoruz.",
    },
  ],
  bring: [
    "Sadece merak.",
    "İstersen evde içtiğin kahveden bir avuç. Onu da demleyip karşılaştıralım.",
  ],
  provided: [
    "Taze kavrulmuş çekirdekler",
    "Değirmen, terazi, V60 ve French press",
    "Fincanlar ve su",
  ],
  faq: [
    {
      question: "Kahve hakkında hiçbir şey bilmiyorum, katılabilir miyim?",
      answer: "Evet. Atölye tam olarak bunun için; terimleri birlikte öğreneceğiz.",
    },
    {
      question: "Çok kahve içmiş olur muyum?",
      answer: "Tadımlar küçük yudumlarla yapılıyor. Her fincandan bir iki yudum alman yeterli.",
    },
    {
      question: "Başvurdum, sonra ne olacak?",
      answer: "İki gün içinde sana yazıp yerini onaylayacağım. Adres de onayla birlikte gelir.",
    },
  ],
};
