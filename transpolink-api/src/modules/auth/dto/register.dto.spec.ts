import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const base = {
  email: 'new@transpolink.dev',
  phone: '+923000000099',
  fullName: 'Test User',
};

async function check(password: string) {
  const dto = plainToInstance(RegisterDto, { ...base, password });
  const errors = await validate(dto);
  return errors.find((e) => e.property === 'password');
}

describe('RegisterDto password rules', () => {
  it('accepts a strong 10+ char password with upper, lower, and digit (happy path)', async () => {
    expect(await check('Customer@2025')).toBeUndefined();
  });

  it('rejects a password shorter than 10 characters', async () => {
    expect(await check('Aa1aa')).toBeDefined();
  });

  it('rejects a password with no uppercase letter', async () => {
    expect(await check('aaaa1aaaa1')).toBeDefined();
  });

  it('rejects a password with no lowercase letter', async () => {
    expect(await check('AAAA1AAAA1')).toBeDefined();
  });

  it('rejects a password with no digit', async () => {
    expect(await check('Aaaaaaaaaa')).toBeDefined();
  });

  it('accepts seed passwords used by prisma/seed.ts', async () => {
    expect(await check('Admin@2025')).toBeUndefined();
    expect(await check('Driver@2025')).toBeUndefined();
    expect(await check('Customer@2025')).toBeUndefined();
  });
});
