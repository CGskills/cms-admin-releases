import { describe, it, expect } from 'vitest';
import { assertNpmPackageName, assertSemver } from '@/lib/validation/input';

describe('NPM Package Name Validation', () => {
  it('should accept valid package names', () => {
    expect(() => assertNpmPackageName('react')).not.toThrow();
    expect(() => assertNpmPackageName('lodash')).not.toThrow();
    expect(() => assertNpmPackageName('my-package')).not.toThrow();
    expect(() => assertNpmPackageName('my.package')).not.toThrow();
  });

  it('should accept valid scoped package names', () => {
    expect(() => assertNpmPackageName('@types/node')).not.toThrow();
    expect(() => assertNpmPackageName('@babel/core')).not.toThrow();
    expect(() => assertNpmPackageName('@company/my-package')).not.toThrow();
  });

  it('should reject path traversal attempts', () => {
    expect(() => assertNpmPackageName('../../../etc/passwd')).toThrow('Invalid package name');
    expect(() => assertNpmPackageName('../../secret')).toThrow('Invalid package name');
  });

  it('should reject invalid characters', () => {
    expect(() => assertNpmPackageName('<script>alert(1)</script>')).toThrow('Invalid package name format');
    expect(() => assertNpmPackageName('package!name')).toThrow('Invalid package name format');
    expect(() => assertNpmPackageName('package name')).toThrow('Invalid package name format');
  });

  it('should reject too long names', () => {
    const longName = 'a'.repeat(215);
    expect(() => assertNpmPackageName(longName)).toThrow('Invalid package name length');
  });

  it('should reject empty names', () => {
    expect(() => assertNpmPackageName('')).toThrow('Invalid package name');
    expect(() => assertNpmPackageName('   ')).toThrow('Invalid package name');
  });

  it('should reject uppercase letters', () => {
    expect(() => assertNpmPackageName('React')).toThrow('Invalid package name format');
    expect(() => assertNpmPackageName('MyPackage')).toThrow('Invalid package name format');
  });
});

describe('Semver Version Validation', () => {
  it('should accept valid semver versions', () => {
    expect(() => assertSemver('1.0.0')).not.toThrow();
    expect(() => assertSemver('0.0.1')).not.toThrow();
    expect(() => assertSemver('10.20.30')).not.toThrow();
  });

  it('should accept semver with pre-release', () => {
    expect(() => assertSemver('1.0.0-alpha')).not.toThrow();
    expect(() => assertSemver('1.0.0-beta.1')).not.toThrow();
    expect(() => assertSemver('1.0.0-rc.1')).not.toThrow();
  });

  it('should accept semver with build metadata', () => {
    expect(() => assertSemver('1.0.0+build.123')).not.toThrow();
    expect(() => assertSemver('1.0.0-alpha+001')).not.toThrow();
  });

  it('should reject invalid semver formats', () => {
    expect(() => assertSemver('1.0')).toThrow('Invalid semver version');
    expect(() => assertSemver('v1.0.0')).toThrow('Invalid semver version');
    expect(() => assertSemver('1.0.0.0')).toThrow('Invalid semver version');
    expect(() => assertSemver('asdfgh')).toThrow('Invalid semver version');
    expect(() => assertSemver('1.x.x')).toThrow('Invalid semver version');
  });

  it('should reject versions with leading zeros', () => {
    expect(() => assertSemver('01.0.0')).toThrow('Invalid semver version');
    expect(() => assertSemver('1.00.0')).toThrow('Invalid semver version');
  });

  it('should reject empty versions', () => {
    expect(() => assertSemver('')).toThrow('Invalid version');
    expect(() => assertSemver('   ')).toThrow('Invalid semver version');
  });
});
