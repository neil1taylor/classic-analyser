import React from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Link,
} from '@carbon/react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="sm">
      <ModalHeader title="About" />
      <ModalBody>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          IBM Cloud Infrastructure Explorer
        </h2>

        <dl style={{ fontSize: '0.875rem', lineHeight: '1.75' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <dt style={{ fontWeight: 600, minWidth: '80px' }}>Version:</dt>
            <dd style={{ margin: 0 }}>1.0.0</dd>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <dt style={{ fontWeight: 600, minWidth: '80px' }}>Author:</dt>
            <dd style={{ margin: 0 }}>Neil Taylor</dd>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <dt style={{ fontWeight: 600, minWidth: '80px' }}>Built with:</dt>
            <dd style={{ margin: 0 }}>
              <Link
                href="https://claude.ai/code"
                target="_blank"
                rel="noopener noreferrer"
              >
                Claude Code
              </Link>
            </dd>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <dt style={{ fontWeight: 600, minWidth: '80px' }}>Licence:</dt>
            <dd style={{ margin: 0 }}>MIT</dd>
          </div>
        </dl>

        <div style={{ marginTop: '1rem' }}>
          <Link
            href="https://cloud.ibm.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            IBM Cloud Documentation
          </Link>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="primary" onClick={handleClose}>
          Close
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default AboutModal;
