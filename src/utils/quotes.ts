import { Quote } from '../types';

export const quotes: Quote[] = [
  {
    text: "You don't have to control your thoughts. You just have to stop letting them control you.",
    author: "Dan Millman"
  },
  {
    text: "Your mind is a powerful thing. When you fill it with positive thoughts, your life will start to change.",
    author: "Unknown"
  },
  {
    text: "Mental health problems don't define who you are. They are something you experience.",
    author: "Unknown"
  },
  {
    text: "Self-care is how you take your power back.",
    author: "Lalah Delia"
  },
  {
    text: "Happiness can be found even in the darkest of times, if one only remembers to turn on the light.",
    author: "Albus Dumbledore"
  },
  {
    text: "You are not your illness. You have an individual story to tell. You have a name, a history, a personality.",
    author: "Julian Seifter"
  },
  {
    text: "Be patient with yourself. Self-growth is tender; it's holy ground. There's no greater investment.",
    author: "Stephen Covey"
  },
  {
    text: "What mental health needs is more sunlight, more candor, and more unashamed conversation.",
    author: "Glenn Close"
  },
  {
    text: "Recovery is not one and done. It is a lifelong journey that takes place one day, one step at a time.",
    author: "Unknown"
  },
  {
    text: "There is hope, even when your brain tells you there isn't.",
    author: "John Green"
  },
  {
    text: "You don't have to be positive all the time. It's perfectly okay to feel sad, angry, annoyed, frustrated, scared, or anxious.",
    author: "Lori Deschene"
  },
  {
    text: "Not until we are lost do we begin to understand ourselves.",
    author: "Henry David Thoreau"
  }
];

export const getRandomQuote = (): Quote => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

export default {
  quotes,
  getRandomQuote,
};