# Contributing to WhatsOpí

*Guidelines for Contributing to the Dominican Republic's AI-Powered Informal Economy Platform*

---

## 🎯 Welcome Contributors

¡Klk! Thank you for your interest in contributing to WhatsOpí, the AI-powered platform designed specifically for the Dominican Republic's informal economy. Whether you're fixing a bug, adding a feature, improving documentation, or enhancing cultural accuracy, your contributions help empower communities through technology.

### 🌟 Our Mission

WhatsOpí exists to democratize access to digital financial services and e-commerce tools for the Dominican Republic's informal economy. Every contribution should align with our core values:

- **Cultural Authenticity**: Respect and enhance Dominican and Haitian cultures
- **Accessibility First**: Design for low-literacy and voice-first users
- **Community Empowerment**: Strengthen rather than disrupt existing social structures
- **Security by Design**: Protect user data and financial transactions
- **Inclusive Technology**: Bridge the digital divide responsibly

---

## 🚀 Getting Started

### 📋 Prerequisites

Before contributing, ensure you have:

- **Node.js 20 LTS** or higher
- **PostgreSQL 15** or higher
- **Redis 7** or higher
- **Git** for version control
- **Docker** (optional, for containerized development)
- **Understanding of Dominican culture** (or willingness to learn)

### 🔧 Development Setup

1. **Fork and Clone**
```bash
git clone https://github.com/YOUR_USERNAME/whatsopi.git
cd whatsopi
git remote add upstream https://github.com/exxede/whatsopi.git
```

2. **Install Dependencies**
```bash
npm install
cd src/api && npm install && cd ../..
```

3. **Environment Setup**
```bash
cp .env.example .env.development
cp src/api/.env.example src/api/.env.development
# Edit with your configuration
```

4. **Database Setup**
```bash
# Start services (if using Docker)
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Run migrations
cd src/api && npm run db:migrate && npm run db:seed
```

5. **Start Development**
```bash
# Terminal 1: API server
cd src/api && npm run dev

# Terminal 2: Frontend
npm run dev
```

6. **Verify Setup**
```bash
curl http://localhost:3001/health  # API health check
open http://localhost:5173         # Frontend
```

---

## 📝 Types of Contributions

### 🐛 Bug Reports

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Test with the latest code from `main` branch
- Include cultural context if relevant (e.g., Dominican Spanish expressions not recognized)

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the issue

## Cultural Context
- Language affected: [Dominican Spanish/Haitian Creole/English]
- Cultural feature: [Voice recognition/Payment/etc.]
- User type: [Dominican user/Haitian user/Colmado owner]

## Steps to Reproduce
1. Step one
2. Step two
3. Issue occurs

## Expected Behavior
What should happen

## Actual Behavior  
What actually happens

## Environment
- Browser: [Chrome/Firefox/Safari]
- Device: [Desktop/Android/iOS]
- Network: [WiFi/Mobile data/2G/3G]
- Location: [Dominican Republic/Haiti/Other]

## Additional Context
Screenshots, error messages, etc.
```

### ✨ Feature Requests

**Feature Request Template:**
```markdown
## Feature Description
Clear description of the proposed feature

## Cultural Relevance
- Target users: [Dominican/Haitian/Both communities]
- Cultural considerations: [Language/customs/business practices]
- Community benefit: How this helps the informal economy

## Use Case
Specific scenarios where this feature would be valuable

## Proposed Implementation
Technical approach or suggestions

## Alternative Solutions
Other ways to address the same need
```

### 🔧 Code Contributions

**Areas where we welcome contributions:**
- **Dominican Spanish improvements**: Better expression recognition
- **Haitian Creole enhancements**: Language processing accuracy
- **Voice interface optimization**: Caribbean accent recognition
- **Accessibility improvements**: Better support for low-literacy users
- **Performance optimization**: Faster loading on 2G/3G networks
- **Cultural validation**: Appropriateness checking
- **Documentation**: User guides, API docs, cultural guidelines
- **Testing**: Cultural scenarios, edge cases, performance tests

---

## 🌍 Cultural Contribution Guidelines

### 📚 Dominican Spanish Contributions

**Guidelines for Dominican expressions:**
- Use authentic Dominican terminology over generic Spanish
- Include context for expressions (formal vs. informal, age groups, regions)
- Provide pronunciation guidance for voice recognition
- Consider cultural appropriateness and sensitivity

**Examples of valuable contributions:**
```typescript
// Adding new Dominican expressions
const dominicanExpressions = {
  // Greetings
  'klk_manito': 'casual greeting between friends',
  'que_tal_loco': 'informal greeting, very common',
  
  // Business terms
  'fiado': 'credit/buying on account',
  'contado': 'cash payment',
  'chin_de_peso': 'small amount of money',
  
  // Regional variations
  'guagua': 'bus (more common in Santo Domingo)',
  'concho': 'shared taxi (more common in interior)'
};
```

### 🇭🇹 Haitian Creole Contributions

**Guidelines for Creole contributions:**
- Respect orthographic standards (official Haitian Creole spelling)
- Include code-switching patterns with Dominican Spanish
- Consider religious and cultural contexts
- Provide cultural context for expressions

**Examples:**
```typescript
// Haitian Creole expressions
const creoleExpressions = {
  'sak_pase_nap_boule': 'standard greeting and response',
  'mwen_bezwen_ed': 'I need help',
  'kote_ou_ye': 'where are you',
  'mesi_anpil': 'thank you very much'
};

// Code-switching patterns
const codeSwitchingPatterns = [
  'klk pero mwen pa konprann', // Spanish greeting + Creole confusion
  'que lo que men kòman ou ye'  // Mixed greeting pattern
];
```

### 🏪 Business Context Contributions

**Colmado and informal economy features:**
- Understand traditional Dominican business practices
- Respect existing social and economic relationships
- Design for trust-based transactions
- Consider family and community dynamics

---

## 💻 Code Style Guidelines

### 🎨 TypeScript Standards

**File naming conventions:**
```
components/
├── auth/
│   ├── LoginPage.tsx          # PascalCase for components
│   └── login-page.test.tsx    # kebab-case for tests
lib/
├── dominican/
│   ├── phone-validator.ts     # kebab-case for utilities
│   └── cultural-analyzer.ts
types/
├── dominican-types.ts         # Dominican-specific types
└── api-types.ts              # API types
```

**Code formatting:**
```typescript
// Use TypeScript strict mode
interface DominicanUser {
  phoneNumber: string;          // Required: +1809XXXXXXX format
  preferredLanguage: 'es-DO' | 'ht' | 'en';
  municipality: string;
  cedula?: string;              // Optional Dominican ID
}

// Cultural context in functions
function validateDominicanPhone(phone: string): PhoneValidation {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const dominicanPattern = /^(\+1)?(809|829|849)\d{7}$/;
  
  return {
    isValid: dominicanPattern.test(cleanPhone),
    formatted: formatForDisplay(cleanPhone),
    carrier: detectCarrier(cleanPhone)
  };
}
```

### 🎤 Voice Interface Guidelines

**Voice command patterns:**
```typescript
// Dominican Spanish voice commands
const dominicanVoiceCommands = [
  // Commerce
  /busco? (.+) en (colmados?|tiendas?) cerca/i,
  /necesito (.+) barato/i,
  /¿?cuánto (vale|cuesta) (.+)\??/i,
  
  // Payments  
  /enviar (\d+) pesos? a (.+)/i,
  /mandar dinero a (.+)/i,
  
  // Help
  /ayuda|socorro|no entiendo/i
];

// Haitian Creole voice commands
const creoleVoiceCommands = [
  /mwen bezwen (.+)/i,          // I need...
  /konben (.+) koute/i,         // How much does ... cost
  /kote mwen ka jwenn (.+)/i    // Where can I find...
];
```

### 🎨 UI/UX Guidelines

**Dominican cultural theming:**
```css
/* Use Dominican flag colors */
:root {
  --dominican-blue: #1B73E8;
  --dominican-red: #DC2626;
  --dominican-white: #FFFFFF;
}

/* Cultural gradients */
.bg-dominican-gradient {
  background: linear-gradient(135deg, var(--dominican-blue) 0%, var(--dominican-white) 50%, var(--dominican-red) 100%);
}

/* Accessible design for low literacy */
.voice-button {
  min-height: 44px;           /* Touch target size */
  font-size: 1.2rem;          /* Readable text */
  border-radius: 12px;        /* Friendly appearance */
}
```

**Responsive design priorities:**
1. **Mobile first**: Optimize for Android 6+ devices
2. **Low bandwidth**: Minimize images and bundle size
3. **Offline support**: Critical features work without internet
4. **Voice accessible**: All functions available via voice

---

## 🧪 Testing Guidelines

### 📋 Testing Requirements

**All contributions must include:**
- Unit tests for new functions/components
- Cultural validation tests for language features
- Integration tests for API changes
- Voice interface tests for speech features
- Accessibility tests for UI components

### 🌍 Cultural Testing

**Dominican Spanish tests:**
```typescript
describe('Dominican Cultural Integration', () => {
  test('should recognize common Dominican greetings', () => {
    const greetings = ['klk', 'que lo que', 'klk manito'];
    
    greetings.forEach(greeting => {
      const result = processText(greeting);
      expect(result.culturalMarkers).toContain('dominican_greeting');
      expect(result.appropriateness).toBeGreaterThan(0.9);
    });
  });

  test('should handle Dominican business terms', () => {
    const businessText = 'Comprar fiado en el colmado';
    const result = processText(businessText);
    
    expect(result.intent).toBe('commerce');
    expect(result.paymentType).toBe('credit');
    expect(result.businessType).toBe('colmado');
  });
});
```

**Voice recognition tests:**
```typescript
describe('Caribbean Voice Processing', () => {
  test('should handle Dominican pronunciation patterns', async () => {
    // Test aspiration, r-weakening, d-deletion
    const testPhrases = [
      'ej que ejto tá caro',      // aspiration
      'pol favol',                 // r-weakening
      'verdá',                     // d-deletion
    ];

    for (const phrase of testPhrases) {
      const result = await voiceProcessor.process(phrase);
      expect(result.confidence).toBeGreaterThan(0.85);
    }
  });
});
```

### 🔒 Security Testing

**Required security tests:**
```typescript
describe('Security Validation', () => {
  test('should sanitize Dominican phone numbers in logs', () => {
    const logEntry = 'User registered: 809-123-4567';
    const sanitized = sanitizeForLogging(logEntry);
    expect(sanitized).toBe('User registered: [PHONE]');
  });

  test('should validate Dominican cédula format', () => {
    const validCedula = '001-1234567-8';
    const invalidCedula = '123-45-6789';
    
    expect(validateCedula(validCedula)).toBe(true);
    expect(validateCedula(invalidCedula)).toBe(false);
  });
});
```

---

## 📖 Documentation Standards

### 🌍 Multi-Language Documentation

**Documentation requirements:**
- **Spanish (Dominican)**: Primary user documentation
- **Haitian Creole**: Secondary user documentation  
- **English**: Technical and developer documentation

**Documentation structure:**
```markdown
# Feature Title

## Español Dominicano
[Feature description in Dominican Spanish with local terminology]

## Kreyòl Ayisyen  
[Feature description in Haitian Creole]

## English (Technical)
[Technical implementation details]
```

### 📝 Code Documentation

**Inline documentation standards:**
```typescript
/**
 * Validates Dominican phone numbers according to local format standards
 * 
 * @param phone - Phone number in any format
 * @returns Validation result with formatting and carrier info
 * 
 * @example
 * // Dominican mobile number
 * validateDominicanPhone('809-123-4567')
 * // Returns: { isValid: true, formatted: '+1-809-123-4567', carrier: 'CLARO' }
 * 
 * @cultural_note Supports all Dominican area codes: 809, 829, 849
 */
function validateDominicanPhone(phone: string): PhoneValidation {
  // Implementation
}
```

### 🎨 API Documentation

**OpenAPI documentation standards:**
```yaml
paths:
  /api/v1/voice/process:
    post:
      summary: Process Dominican Spanish or Haitian Creole voice command
      description: |
        Processes voice commands with cultural context understanding.
        Optimized for Caribbean accents and local expressions.
      parameters:
        - name: language
          in: formData
          schema:
            type: string
            enum: [es-DO, ht, en]
            example: es-DO
          description: Expected language (Dominican Spanish recommended)
```

---

## 🔄 Pull Request Process

### 📋 PR Checklist

Before submitting a pull request:

- [ ] **Code Quality**
  - [ ] TypeScript strict mode compliance
  - [ ] ESLint passes without warnings
  - [ ] Prettier formatting applied
  - [ ] No console.log statements in production code

- [ ] **Testing**
  - [ ] Unit tests written and passing
  - [ ] Cultural validation tests included
  - [ ] Integration tests for API changes
  - [ ] Voice interface tests (if applicable)
  - [ ] Test coverage maintains >85%

- [ ] **Cultural Validation**
  - [ ] Dominican Spanish expressions validated by native speakers
  - [ ] Haitian Creole features reviewed by community members
  - [ ] Cultural appropriateness verified
  - [ ] Accessibility tested for low-literacy users

- [ ] **Documentation**
  - [ ] Code comments added for complex logic
  - [ ] API documentation updated (if applicable)
  - [ ] User documentation updated (Spanish/Creole/English)
  - [ ] CHANGELOG.md updated

- [ ] **Security**
  - [ ] No hardcoded secrets or credentials
  - [ ] Input validation for all user inputs
  - [ ] Cultural data handled respectfully
  - [ ] Security tests written for sensitive features

### 📝 PR Template

```markdown
## Description
Brief description of changes

## Cultural Impact
- [ ] Dominican Spanish features affected
- [ ] Haitian Creole features affected
- [ ] Cultural appropriateness validated
- [ ] Community feedback incorporated

## Type of Changes
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that changes existing functionality)
- [ ] Documentation update
- [ ] Cultural enhancement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Cultural validation tests pass
- [ ] Voice interface tests pass (if applicable)
- [ ] Manual testing completed

## Accessibility
- [ ] Voice navigation works
- [ ] Low-literacy friendly
- [ ] Mobile responsive
- [ ] Offline functionality maintained

## Screenshots (if applicable)
[Add screenshots showing UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Cultural appropriateness verified
- [ ] Documentation updated
- [ ] Tests added/updated
```

### 🔍 Review Process

**Review criteria:**
1. **Technical Quality**: Code quality, performance, security
2. **Cultural Accuracy**: Language processing, cultural appropriateness
3. **User Experience**: Accessibility, mobile optimization, voice interface
4. **Documentation**: Clear documentation in appropriate languages
5. **Testing**: Comprehensive test coverage including cultural scenarios

**Review timeline:**
- **Small changes**: 1-2 business days
- **Medium changes**: 3-5 business days  
- **Large changes**: 5-10 business days
- **Cultural features**: Additional community review time

---

## 🏷️ Versioning and Releases

### 📋 Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality additions
- **PATCH** version for backward-compatible bug fixes

**Cultural version considerations:**
- New language support = MINOR version
- Cultural expression improvements = PATCH version
- Breaking cultural API changes = MAJOR version

### 🚀 Release Process

**Release types:**
- **Patch releases**: Bug fixes, cultural expression updates
- **Minor releases**: New features, language improvements
- **Major releases**: Significant platform changes

**Release schedule:**
- **Patch releases**: As needed (weekly if necessary)
- **Minor releases**: Monthly
- **Major releases**: Quarterly

---

## 🤝 Community Guidelines

### 🌟 Code of Conduct

**Our commitment:**
- **Respect**: Honor Dominican and Haitian cultures
- **Inclusion**: Welcome contributors from all backgrounds
- **Authenticity**: Maintain cultural authenticity in all features
- **Collaboration**: Work together for community benefit
- **Learning**: Embrace opportunities to learn about cultures

**Expected behavior:**
- Use welcoming and inclusive language
- Respect different cultural perspectives
- Focus on community benefit
- Accept constructive feedback gracefully
- Show empathy towards community members

**Unacceptable behavior:**
- Cultural appropriation or misrepresentation
- Discriminatory language or behavior
- Harassment or trolling
- Publishing private cultural information without permission
- Other conduct inappropriate for a professional setting

### 🌍 Cultural Sensitivity Guidelines

**When working with Dominican culture:**
- Research and understand context before making assumptions
- Consult with Dominican community members
- Respect religious and cultural traditions
- Use appropriate Spanish dialect and expressions
- Consider socioeconomic context

**When working with Haitian culture:**
- Respect the complexity of Haitian Creole language
- Understand the bicultural Dominican-Haitian context
- Consider historical and social relationships
- Use authentic Creole orthography
- Consult with Haitian community members

### 📞 Getting Help

**For technical questions:**
- **GitHub Discussions**: Technical implementation questions
- **Discord**: Real-time chat with developers
- **Email**: dev@whatsopi.do

**For cultural guidance:**
- **Cultural Team**: cultural@whatsopi.do
- **Dominican Community**: dominican-community@whatsopi.do
- **Haitian Community**: haitian-community@whatsopi.do

**For security concerns:**
- **Security Team**: security@whatsopi.do
- **Private security issues**: Use GitHub Security Advisories

---

## 🎓 Learning Resources

### 📚 Cultural Resources

**Dominican Culture:**
- [Diccionario Dominicano](https://example.com) - Dominican Spanish dictionary
- "Dominican Spanish Expressions" - Cultural expression guide
- "Colmado Culture in DR" - Understanding local business practices

**Haitian Culture:**
- [Kreyòl Pale](https://example.com) - Haitian Creole learning resources
- "Haitian-Dominican Relations" - Historical and cultural context
- "Creole Orthography Guide" - Proper spelling and grammar

### 🛠️ Technical Resources

**Development:**
- [WhatsOpí Developer Guide](docs/developer/DEVELOPER_GUIDE.md)
- [API Documentation](docs/api/README.md)
- [Cultural Testing Guide](docs/testing/CULTURAL_TESTING.md)

**AI/ML:**
- "Building Culturally-Aware AI" - Best practices guide
- [Voice Processing for Caribbean Accents](docs/ai/VOICE_PROCESSING.md)
- "Multilingual NLP Implementation" - Technical guide

---

## 🏆 Recognition

### 🌟 Contributor Recognition

**Hall of Fame:**
We maintain a [Contributors Hall of Fame](CONTRIBUTORS.md) recognizing:
- **Code Contributors**: Technical implementations
- **Cultural Advisors**: Language and cultural guidance
- **Community Testers**: User experience validation
- **Documentation Writers**: Multi-language documentation
- **Security Reviewers**: Security and compliance expertise

**Recognition levels:**
- **Bronze**: 1-5 meaningful contributions
- **Silver**: 6-15 contributions with cultural impact
- **Gold**: 16+ contributions with significant platform impact
- **Platinum**: Outstanding leadership in cultural technology

### 🎖️ Special Recognition

**Cultural Ambassador**: Contributors who significantly improve cultural accuracy
**Voice Champion**: Contributors who enhance voice interface capabilities
**Accessibility Advocate**: Contributors who improve platform accessibility
**Community Builder**: Contributors who strengthen community engagement

---

## 📋 Contributor License Agreement

By contributing to WhatsOpí, you agree that:

1. **Your contributions** are your original work or you have rights to contribute them
2. **License compatibility** with our MIT license
3. **Cultural respect** in all contributions
4. **Community benefit** as the primary goal
5. **Code of conduct** adherence in all interactions

---

## 🎯 Getting Started Checklist

Ready to contribute? Here's your checklist:

- [ ] **Read this guide** completely
- [ ] **Set up development environment** following the setup instructions
- [ ] **Join our community** on Discord/GitHub Discussions
- [ ] **Pick an issue** labeled "good-first-issue" or "cultural-contribution"
- [ ] **Understand cultural context** by reading relevant cultural resources
- [ ] **Write your code** following our guidelines
- [ ] **Test thoroughly** including cultural validation
- [ ] **Submit your PR** using our template
- [ ] **Respond to feedback** from code review

---

**¡Klk! Ready to build technology that truly serves the Dominican community!** 🇩🇴

Together, we're creating technology that empowers rather than replaces, that understands rather than assumes, and that serves real community needs with authentic cultural respect.

**¡Vámonos a cambiar el mundo, tiguer!** 🚀

---

**Document Information:**
- **Version**: 1.0.0
- **Last Updated**: December 2024  
- **Language**: English
- **Also Available**: [Español](CONTRIBUTING_ES.md), [Kreyòl](CONTRIBUTING_HT.md)
- **Maintained by**: WhatsOpí Development Community

**Contact:**
- **General Questions**: contribute@whatsopi.do
- **Cultural Guidance**: cultural@whatsopi.do
- **Technical Support**: dev@whatsopi.do
- **Community**: community@whatsopi.do