// nothing here yet lol

// when the actual product is released, i'll start work on the modified compactb ai for buddy music

// CompactB is an AI tool, trained on written inputs and responses, responses are either static, or generated with our AI training type, optimised for CompactB.

function noCompactB() {
    const overlay = document.createElement('div');
    overlay.id = 'compactb-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'black';
    overlay.style.opacity = '0.9';
    overlay.style.zIndex = '999';

    const popup = document.createElement('div');
    popup.id = 'compactb-popup';
    popup.textContent = 'CompactB for Buddy Music isn\'t available yet.';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#aa2211';
    popup.style.color = '#feaaaa';
    popup.style.fontSize = '24px';
    popup.style.fontFamily = 'Inter Tight';
    popup.style.fontWeight = '700';
    popup.style.padding = '24px';
    popup.style.border = '2px solid black';
    popup.style.borderRadius = '24px';
    popup.style.boxShadow = '0px 0px 12px rgb(255, 85, 62)';
    popup.style.zIndex = '1000';

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
}

noCompactB();