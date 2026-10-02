import React, { useEffect, useRef } from 'react';

/*
  Last-resort export: the backup JSON as selectable text.
  --------------------------------------------------------
  Needs nothing from the host — no file picker, no download pipeline, no
  clipboard API. The user selects the text themselves (manual Ctrl+C is never
  blocked the way programmatic clipboard access is), pastes it into a plain
  text file, saves it with a .json extension, and imports that file wherever
  the board needs to go.
*/
export default function BackupTextModal({ text, fileName, onClose }) {
  const areaRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    areaRef.current?.focus();
    areaRef.current?.select();
  }, []);

  const selectAll = () => {
    areaRef.current?.focus();
    areaRef.current?.select();
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Backup as text">
        <header className="modal__head">
          <div className="modal__heading">
            <span className="modal__path">
              Tracker <span className="sep">/</span> Backup text
            </span>
            <h2>Copy everything below into a <code>{fileName}</code> file</h2>
          </div>
        </header>
        <div className="modal__body">
          <textarea
            ref={areaRef}
            readOnly
            className="backup-text"
            value={text}
            onFocus={(e) => e.target.select()}
            aria-label="Backup JSON text"
          />
        </div>
        <footer className="modal__foot">
          <button className="btn btn--sm" onClick={selectAll}>
            Select all
          </button>
          <button className="btn btn--sm" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </>
  );
}
