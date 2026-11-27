'use client';
import { use } from 'react';
import { browser } from 'react-dom';
import RichTextArea from './RichTextArea.jsx';

export default function Editor() {
  use(browser());
  return <RichTextArea />;
}
